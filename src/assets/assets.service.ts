import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  Sse,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import axios from 'axios';
import { BusinessDoc, MediaPresetDoc, UserDoc } from 'src/database/schema';
import { Asset, AssetDoc } from 'src/database/schema/asset.schema';
import {
  GenerateCopyDto,
  InitiateImageGenerationDto,
  InitiateVideoGenerationDto,
  PreflightMultiGenerationDto,
  RegenerateImageDto,
} from './dto/generate-media.dto';
import { MediaGenerationService } from 'src/media-generation/media-generation.service';
import { Credentials, UploadService } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';
import { TokenBillingService } from 'src/token-billing/token-billing.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private awsCredentials: Credentials;

  private readonly generationPendingTimeoutMs = 30 * 60 * 1000;

  constructor(
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('users') private readonly userModel: Model<UserDoc>,
    @InjectModel('media-presets')
    private readonly mediaPresetModel: Model<MediaPresetDoc>,
    private readonly mediaGenerationService: MediaGenerationService,
    private readonly tokenBilling: TokenBillingService,
    private readonly uploadService: UploadService,
    private readonly configService: AppConfigService,
  ) {
    this.awsCredentials = {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
      bucketName: this.configService.get('S3_BUCKET'),
    };
  }

  private async assertUserCanReserveTokens(params: {
    userId: Types.ObjectId;
    kind: Parameters<TokenBillingService['reserveForAsset']>[0]['kind'];
  }) {
    const quoteAmount = this.tokenBilling.getQuoteAmount(params.kind);
    if (quoteAmount <= 0) {
      throw new BadRequestException('Invalid quote amount');
    }

    const loadUserBalances = async () =>
      this.userModel
        .findById(params.userId)
        .select({
          subscriptionTokenBalance: 1,
          topUpTokenBalance: 1,
          reservedTokenBalance: 1,
        })
        .lean();

    let user = await loadUserBalances();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const maybeRestoreStaleReserves = async () => {
      await this.tokenBilling
        .restoreStaleGenerationReservesForUser({
          userId: params.userId,
          pendingTimeoutMs: this.generationPendingTimeoutMs,
        })
        .catch(() => undefined);

      user = await loadUserBalances();
      if (!user) {
        throw new NotFoundException('User not found');
      }
    };

    const reservedTokenBalance = user.reservedTokenBalance ?? 0;

    let didRestore = false;
    if (reservedTokenBalance > 0) {
      await maybeRestoreStaleReserves();
      didRestore = true;
    }

    const spendableAfterRestore =
      (user.subscriptionTokenBalance ?? 0) + (user.topUpTokenBalance ?? 0);

    if (spendableAfterRestore < quoteAmount) {
      if (!didRestore) {
        await maybeRestoreStaleReserves();
      }

      const spendableFinal =
        (user.subscriptionTokenBalance ?? 0) + (user.topUpTokenBalance ?? 0);
      if (spendableFinal < quoteAmount) {
        throw new BadRequestException({
          message: 'Insufficient tokens',
          code: 'INSUFFICIENT_TOKENS',
        });
      }
    }
  }

  async preflightMultiGeneration(
    userId: Types.ObjectId,
    dto: PreflightMultiGenerationDto,
  ) {
    const tokensRequired = (dto.items || []).reduce((sum, item) => {
      const quoteAmount = this.tokenBilling.getQuoteAmount(item.kind);
      const count = Number(item.count ?? 0);
      if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) return sum;
      if (!Number.isFinite(count) || count <= 0) return sum;
      return sum + quoteAmount * count;
    }, 0);

    const loadUserBalances = async () =>
      this.userModel
        .findById(userId)
        .select({
          subscriptionTokenBalance: 1,
          topUpTokenBalance: 1,
          reservedTokenBalance: 1,
        })
        .lean();

    let user = await loadUserBalances();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const computeSpendableBalance = (u: {
      subscriptionTokenBalance?: number;
      topUpTokenBalance?: number;
    }) => (u.subscriptionTokenBalance ?? 0) + (u.topUpTokenBalance ?? 0);

    const spendableBalance = computeSpendableBalance(user);

    const initialCanGenerate = spendableBalance >= tokensRequired;
    if (!initialCanGenerate) {
      const reservedTokenBalance = user.reservedTokenBalance ?? 0;
      if (reservedTokenBalance > 0) {
        await this.tokenBilling
          .restoreStaleGenerationReservesForUser({
            userId,
            pendingTimeoutMs: this.generationPendingTimeoutMs,
          })
          .catch(() => undefined);

        user = await loadUserBalances();
        if (!user) {
          throw new NotFoundException('User not found');
        }
      }
    }

    const spendableFinal = computeSpendableBalance(user);

    return {
      canGenerate: spendableFinal >= tokensRequired,
      tokensRequired,
    };
  }

  async getBusinessIdForUser(userId: Types.ObjectId): Promise<Types.ObjectId> {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new NotFoundException('Business not found for this user.');
    }
    return business._id;
  }

  async getAssetById(params: { assetId: string }): Promise<Asset> {
    const { assetId } = params;

    if (!Types.ObjectId.isValid(assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    const asset = await this.assetModel.findById(assetId).lean<Asset>();

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  async generateImageAsset(
    userId: Types.ObjectId,
    dto: InitiateImageGenerationDto,
  ) {
    const mediaPresetExists = dto.imagePresetId
      ? await this.mediaPresetModel.findOne({
          _id: dto.imagePresetId,
          prompt: { $exists: true },
        })
      : null;

    if (dto.imagePresetId && !mediaPresetExists) {
      throw new NotFoundException('Media preset not found');
    }

    await this.assertUserCanReserveTokens({
      userId,
      kind: 'image_ad_generation',
    });

    const businessId = await this.getBusinessIdForUser(userId);

    const payload = {
      type: 'image' as const,
      businessId: businessId.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      ...(dto.imagePresetId && { mediaPresetId: dto.imagePresetId }),
      productId: dto.productId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta,
    };

    const { assetId } =
      await this.mediaGenerationService.initiateAssetGenWithN8n(
        userId,
        payload,
      );

    await this.tokenBilling.reserveForAsset({
      userId,
      assetId,
      kind: 'image_ad_generation',
    });

    return {
      assetId,
    };
  }

  async generateCopy(userId: Types.ObjectId, dto: GenerateCopyDto) {
    type N8nGenerateCopyResponse = {
      success: boolean;
      data: {
        assetId: string;
        headline?: string;
        description?: string;
        cta?: string;
        caption: string;
        script?: string;
      };
    };

    const preset = await this.mediaPresetModel.findById(dto.mediaPresetId);
    if (!preset) {
      throw new NotFoundException('Media preset not found');
    }

    await this.assertUserCanReserveTokens({
      userId,
      kind:
        preset.type === 'image'
          ? 'image_copy_generation'
          : 'video_copy_generation',
    });

    const businessId = await this.getBusinessIdForUser(userId);

    const url = `${this.configService.get('AMPLIFY_N8N_API_URL')}/webhook/asset/generate-copy`;
    try {
      this.logger.log('Generating copy with N8N');
      const response = await axios.post<N8nGenerateCopyResponse>(
        url,
        {
          productName: dto.productName,
          productDescription: dto.productDescription,
          productCategory: dto.productCategory,
          type: preset.type,
          businessId: businessId.toString(),
          mediaPresetId: preset._id.toString(),
          duration: 12,
          productId: dto.productId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 150_000,
        },
      );

      const assetId = response.data?.data?.assetId;
      if (assetId) {
        await this.tokenBilling.reserveForAsset({
          userId,
          assetId,
          kind:
            preset.type === 'image'
              ? 'image_copy_generation'
              : 'video_copy_generation',
        });

        return response.data;
      } else {
        throw new BadRequestException('Failed to generate copy');
      }
    } catch (e: any) {
      if (e instanceof HttpException) {
        throw e;
      }
      this.logger.error('Failed to generate copy', e);
      throw new BadRequestException('Failed to generate copy');
    }
  }

  async generateVideoAsset(
    userId: Types.ObjectId,
    dto: InitiateVideoGenerationDto,
  ) {
    const mediaPresetExists = dto.videoPresetId
      ? await this.mediaPresetModel.findOne({
          _id: dto.videoPresetId,
          prompt: { $exists: true },
        })
      : null;

    if (dto.videoPresetId && !mediaPresetExists) {
      throw new NotFoundException('Media preset not found');
    }

    await this.assertUserCanReserveTokens({
      userId,
      kind: 'video_generation_12s',
    });

    const businessId = await this.getBusinessIdForUser(userId);

    const payload = {
      type: 'video' as const,
      businessId: businessId.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      ...(dto.videoPresetId && { mediaPresetId: dto.videoPresetId }),
      productId: dto.productId,
      script: dto.script,
      includeMusic: dto.includeMusic,
      includeVoiceOver: dto.includeVoiceOver,
    };

    const { assetId } =
      await this.mediaGenerationService.initiateAssetGenWithN8n(
        userId,
        payload,
      );

    await this.tokenBilling.reserveForAsset({
      userId,
      assetId,
      kind: 'video_generation_12s',
    });

    return {
      assetId,
    };
  }

  async uploadProductImage(
    userId: Types.ObjectId,
    file: Express.Multer.File,
  ): Promise<{ url: string; key: string }> {
    const businessId = await this.getBusinessIdForUser(userId);
    const result = await this.uploadService.uploadFile(
      file,
      businessId.toHexString(),
      'uploaded',
      this.awsCredentials,
      'product-uploads',
    );
    return { url: result.url, key: result.key };
  }

  async reGenerateImageAsset(userId: Types.ObjectId, dto: RegenerateImageDto) {
    const asset = await this.getAssetById({ assetId: dto.assetId });

    if (!asset || asset.status !== 'completed') {
      throw new NotFoundException('Asset not found');
    }

    await this.assertUserCanReserveTokens({
      userId,
      kind: 'image_ad_generation',
    });

    const businessId = await this.getBusinessIdForUser(userId);

    const productImages = [asset.mediaUrl, ...dto.productImages].filter(
      (url): url is string => typeof url === 'string' && url.length > 0,
    );

    const payload = {
      type: 'image' as const,
      businessId: businessId.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages,
      productId: dto.productId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta,
    };

    const { assetId } =
      await this.mediaGenerationService.initiateAssetGenWithN8n(
        userId,
        payload,
      );

    await this.tokenBilling.reserveForAsset({
      userId,
      assetId,
      kind: 'image_ad_generation',
    });

    return {
      assetId,
    };
  }
}
