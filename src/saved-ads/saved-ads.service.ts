import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UtilsService } from 'src/utils/utils.service';
import { AssetDoc, BusinessDoc, SavedAdDoc } from 'src/database/schema';
import { CreateSavedAdDto } from './dto/create-saved-ads.dto';
import { ListSavedAdsDto } from './dto/list-saved-ads.dto';

@Injectable()
export class SavedAdsService {
  constructor(
    @InjectModel('saved-ads')
    private readonly savedAssetModel: Model<SavedAdDoc>,
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    private readonly utilsService: UtilsService,
  ) {}

  private async getBusinessIdForUser(userId: Types.ObjectId) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new NotFoundException('Business not found for this user.');
    }
    return business._id;
  }

  async listSavedAds(userId: Types.ObjectId, dto: ListSavedAdsDto) {
    const businessId = await this.getBusinessIdForUser(userId);

    const page = dto.page || 1;
    const perPage = dto.perPage || 12;
    const skip = (page - 1) * perPage;

    const filter: Record<string, any> = { businessId };

    if (Array.isArray(dto.productIds) && dto.productIds.length > 0) {
      const productIds = dto.productIds
        .filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0,
        )
        .map((p) => p.trim());
      if (productIds.length > 0) {
        filter.productId = { $in: productIds };
      }
    }

    if (dto.from || dto.to) {
      const range: Record<string, any> = {};
      if (dto.from) {
        const d = new Date(dto.from);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (dto.to) {
        const d = new Date(dto.to);
        if (!Number.isNaN(d.getTime())) range.$lte = d;
      }
      if (Object.keys(range).length > 0) {
        filter.createdAt = range;
      }
    }

    if (Array.isArray(dto.tags) && dto.tags.length > 0) {
      const tags = dto.tags
        .filter(
          (t): t is string => typeof t === 'string' && t.trim().length > 0,
        )
        .map((t) => t.trim())
        .slice(0, 20);
      if (tags.length > 0) {
        const regexes = tags.map(
          (t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        );
        filter.$or = regexes.flatMap((re) => [
          { headline: re },
          { bodyCopy: re },
          { caption: re },
          { script: re },
          { brandName: re },
          { websiteUrl: re },
        ]);
      }
    }

    if (dto.type) {
      const assets = await this.assetModel
        .find({ businessId, type: dto.type })
        .select({ _id: 1 })
        .lean();
      const ids = assets.map((a: any) => a?._id).filter(Boolean);
      filter.assetId = { $in: ids };
    }

    const [items, total] = await Promise.all([
      this.savedAssetModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .populate('assetId', 'type mediaUrl')
        .lean(),
      this.savedAssetModel.countDocuments(filter).exec(),
    ]);

    const pagination = this.utilsService.getPaginationMeta({
      total,
      page,
      perPage,
    });

    return { items, pagination };
  }

  async createSavedAd(userId: Types.ObjectId, dto: CreateSavedAdDto) {
    const businessId = await this.getBusinessIdForUser(userId);

    if (!Types.ObjectId.isValid(dto.assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    const asset = await this.assetModel
      .findOne({ _id: new Types.ObjectId(dto.assetId), businessId })
      .lean();

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const created = await this.savedAssetModel.create({
      businessId,
      assetId: new Types.ObjectId(dto.assetId),
      productId: dto.productId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta,
      caption: dto.caption,
      script: dto.script,
      brandName: dto.brandName,
      websiteUrl: dto.websiteUrl,
    });

    const populated = await this.savedAssetModel
      .findById(created._id)
      .populate('assetId', 'type mediaUrl')
      .lean();

    return populated;
  }

  async deleteSavedAd(userId: Types.ObjectId, id: string) {
    const businessId = await this.getBusinessIdForUser(userId);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid saved asset id');
    }

    const deleted = await this.savedAssetModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), businessId })
      .lean();

    if (!deleted) {
      throw new NotFoundException('Saved asset not found');
    }

    return deleted;
  }
}
