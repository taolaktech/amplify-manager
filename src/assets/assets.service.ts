import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { BusinessDoc, CampaignDocument } from 'src/database/schema';
import { Asset, AssetDoc } from 'src/database/schema/asset.schema';
import { SaveCampaignAssetDto } from './dto/save-campaign-asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('campaigns')
    private readonly campaignModel: Model<CampaignDocument>,
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
    campaignId?: string;
    productId?: string;
    type?: 'image' | 'video';
  }): Promise<Asset[]> {
    const businessId = await this.getBusinessIdForUser(params.userId);

    const query: RootFilterQuery<AssetDoc> = { businessId };
    if (typeof params.campaignId === 'string' && params.campaignId.length) {
      if (!Types.ObjectId.isValid(params.campaignId)) {
        throw new BadRequestException('Invalid campaignId');
      }
      query.campaignId = new Types.ObjectId(params.campaignId);
    } else {
      // Draft assets scope (used before a campaign exists)
      query.campaignId = null;
    }
    if (params.productId) query.productId = params.productId;
    if (params.type) query.type = params.type;

    return this.assetModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async saveDraftAsset(params: {
    userId: Types.ObjectId;
    dto: SaveCampaignAssetDto;
  }): Promise<{ assetId: string; status: 'saved' }> {
    const { userId, dto } = params;

    const businessId = await this.getBusinessIdForUser(userId);

    const metadata = dto.metadata || {};

    const docToInsert: Partial<Asset> = {
      businessId,
      campaignId: null,
      productId: dto.productId || metadata.productId,
      type: dto.type,
      source: dto.source,
      url: dto.url,
      storageUrl: dto.storageUrl,
      thumbnailUrl: dto.thumbnailUrl,
      destinationUrl: metadata.destinationUrl,
      promptUsed: metadata.promptUsed,
      headlineUsed: metadata.headlineUsed,
      descriptionUsed: metadata.descriptionUsed,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      duration:
        typeof metadata.duration === 'number' ? metadata.duration : undefined,
      resolution:
        typeof metadata.resolution === 'string'
          ? metadata.resolution
          : undefined,
    };

    if (dto.type === 'image' && !dto.url) {
      throw new BadRequestException('url is required for image assets');
    }

    if (dto.type === 'video' && !dto.storageUrl) {
      throw new BadRequestException('storageUrl is required for video assets');
    }

    if (!docToInsert.productId) {
      throw new BadRequestException('productId is required');
    }

    try {
      const created = await this.assetModel.create(docToInsert);
      return {
        assetId: (created._id as unknown as Types.ObjectId).toString(),
        status: 'saved',
      };
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await this.assetModel.findOne({
          businessId,
          campaignId: null,
          productId: docToInsert.productId,
          type: docToInsert.type,
          source: docToInsert.source,
          url: docToInsert.url,
          storageUrl: docToInsert.storageUrl,
        });

        if (existing) {
          return {
            assetId: (existing._id as unknown as Types.ObjectId).toString(),
            status: 'saved',
          };
        }
      }
      throw new InternalServerErrorException('Could not save asset');
    }
  }

  async saveCampaignAsset(params: {
    userId: Types.ObjectId;
    campaignId: string;
    dto: SaveCampaignAssetDto;
  }): Promise<{ assetId: string; status: 'saved' }> {
    const { userId, campaignId, dto } = params;

    if (!Types.ObjectId.isValid(campaignId)) {
      throw new BadRequestException('Invalid campaign id');
    }

    const businessId = await this.getBusinessIdForUser(userId);

    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const metadata = dto.metadata || {};

    const docToInsert: Partial<Asset> = {
      businessId,
      campaignId: new Types.ObjectId(campaignId),
      productId: dto.productId || metadata.productId,
      type: dto.type,
      source: dto.source,
      url: dto.url,
      storageUrl: dto.storageUrl,
      thumbnailUrl: dto.thumbnailUrl,
      destinationUrl: metadata.destinationUrl,
      promptUsed: metadata.promptUsed,
      headlineUsed: metadata.headlineUsed,
      descriptionUsed: metadata.descriptionUsed,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      duration:
        typeof metadata.duration === 'number' ? metadata.duration : undefined,
      resolution:
        typeof metadata.resolution === 'string'
          ? metadata.resolution
          : undefined,
    };

    if (dto.type === 'image' && !dto.url) {
      throw new BadRequestException('url is required for image assets');
    }

    if (dto.type === 'video' && !dto.storageUrl) {
      throw new BadRequestException('storageUrl is required for video assets');
    }

    if (!docToInsert.productId) {
      throw new BadRequestException('productId is required');
    }

    try {
      const created = await this.assetModel.create(docToInsert);
      return {
        assetId: (created._id as unknown as Types.ObjectId).toString(),
        status: 'saved',
      };
    } catch (err: any) {
      // Dedupe behavior: return existing asset if unique index triggers
      if (err?.code === 11000) {
        const existing = await this.assetModel.findOne({
          businessId,
          campaignId: new Types.ObjectId(campaignId),
          productId: docToInsert.productId,
          type: docToInsert.type,
          source: docToInsert.source,
          url: docToInsert.url,
          storageUrl: docToInsert.storageUrl,
        });

        if (existing) {
          return {
            assetId: (existing._id as unknown as Types.ObjectId).toString(),
            status: 'saved',
          };
        }
      }
      throw new InternalServerErrorException('Could not save asset');
    }
  }
}
