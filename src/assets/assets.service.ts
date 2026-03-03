import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { BusinessDoc, MediaPresetDoc } from 'src/database/schema';
import { Asset, AssetDoc } from 'src/database/schema/asset.schema';
import {
  InitiateImageGenerationDto,
  InitiateVideoGenerationDto,
  RegenerateImageDto,
} from './dto/generate-media.dto';
import { MediaGenerationService } from 'src/media-generation/media-generation.service';
import { OpenAIService } from 'src/openai/openai.service';
import {
  GenerateVideoScriptDto,
  GenerateImageAdCopyDto,
} from './dto/generate-copy.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('media-presets')
    private readonly mediaPresetModel: Model<MediaPresetDoc>,
    private readonly mediaGenerationService: MediaGenerationService,
    private readonly openAIService: OpenAIService,
  ) {}

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

  async generateVideoScript(
    userId: Types.ObjectId,
    dto: GenerateVideoScriptDto,
  ): Promise<{ script: string }> {
    void userId;
    const script = await this.openAIService.generateVideoScript({
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      presetLabel: dto.presetLabel,
      presetDuration: dto.presetDuration,
      presetResolution: dto.presetResolution,
    });
    return { script };
  }

  async generateImageAdCopy(
    userId: Types.ObjectId,
    dto: GenerateImageAdCopyDto,
  ) {
    void userId;
    return this.openAIService.generateImageAdCopy({
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      presetLabel: dto.presetLabel,
      presetResolution: dto.presetResolution,
    });
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
