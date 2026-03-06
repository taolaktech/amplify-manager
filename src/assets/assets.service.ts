import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import axios from 'axios';
import { BusinessDoc, MediaPresetDoc } from 'src/database/schema';
import { Asset, AssetDoc } from 'src/database/schema/asset.schema';
import {
  GenerateCopyDto,
  InitiateImageGenerationDto,
  InitiateVideoGenerationDto,
  RegenerateImageDto,
} from './dto/generate-media.dto';
import { MediaGenerationService } from 'src/media-generation/media-generation.service';
import { Credentials, UploadService } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class AssetsService {
  private awsCredentials: Credentials;

  constructor(
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('media-presets')
    private readonly mediaPresetModel: Model<MediaPresetDoc>,
    private readonly mediaGenerationService: MediaGenerationService,
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

  async getBusinessIdForUser(userId: Types.ObjectId): Promise<Types.ObjectId> {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new NotFoundException('Business not found for this user.');
    }
    return business._id;
  }

  async listAssets(params: {
    userId: Types.ObjectId;
    productId?: string;
    type?: string;
  }): Promise<Asset[]> {
    const businessId = await this.getBusinessIdForUser(params.userId);

    const query: RootFilterQuery<AssetDoc> = { businessId };
    if (params.productId) query.productId = params.productId;
    if (params.type) query.type = params.type;

    return this.assetModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async getAssetById(params: {
    userId: Types.ObjectId;
    assetId: string;
  }): Promise<Asset> {
    const { userId, assetId } = params;

    if (!Types.ObjectId.isValid(assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    const asset = await this.assetModel
      .findOne({ _id: new Types.ObjectId(assetId) })
      .lean<Asset>();

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

    return {
      assetId,
    };
  }

  async generateCopy(userId: Types.ObjectId, dto: GenerateCopyDto) {
    type N8nGenerateCopyResponse = {
      success: boolean;
      data: {
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

    await this.getBusinessIdForUser(userId);

    const url = `${this.configService.get('AMPLIFY_N8N_API_URL')}/webhook/asset/generate-copy`;
    try {
      const response = await axios.post<N8nGenerateCopyResponse>(
        url,
        {
          productName: dto.productName,
          productDescription: dto.productDescription,
          productCategory: dto.productCategory,
          presetCreativeDirection: Array.isArray(preset.creativeDirections)
            ? preset.creativeDirections
            : [],
          presetNiche: Array.isArray(preset.niches) ? preset.niches : [],
          type: preset.type,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      return response.data;
    } catch (e: any) {
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

    const businessId = await this.getBusinessIdForUser(userId);

    const payload = {
      type: 'video' as const,
      businessId: businessId.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      ...(dto.videoPresetId && { mediaPresetId: dto.videoPresetId }),
      productId: dto.productId,
    };

    const { assetId } =
      await this.mediaGenerationService.initiateAssetGenWithN8n(
        userId,
        payload,
      );

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
    const asset = await this.getAssetById({ userId, assetId: dto.assetId });

    if (
      !asset ||
      asset.type !== 'image' ||
      asset.status !== 'completed' ||
      asset.mediaUrl
    ) {
      throw new NotFoundException('Asset not found');
    }

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

    return {
      assetId,
    };
  }
}
