import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UtilsService } from 'src/utils/utils.service';
import {
  AssetDoc,
  BusinessDoc,
  SavedAdDoc,
  UserDoc,
} from 'src/database/schema';
import { CreateSavedAdDto } from './dto/create-saved-ads.dto';
import { ListSavedAdsDto } from './dto/list-saved-ads.dto';
import { Credentials, UploadService } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';
import * as path from 'node:path';

@Injectable()
export class SavedAdsService {
  private readonly awsCredentials: Credentials;

  constructor(
    @InjectModel('saved-ads')
    private readonly savedAssetModel: Model<SavedAdDoc>,
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('users') private readonly userModel: Model<UserDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
    private readonly utilsService: UtilsService,
    private readonly uploadService: UploadService,
    private readonly config: AppConfigService,
  ) {
    this.awsCredentials = {
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION'),
      bucketName: this.config.get('S3_BUCKET'),
    };
  }

  private async getBusinessIdForUser(userId: Types.ObjectId) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new NotFoundException('Business not found for this user.');
    }
    return business._id;
  }

  private async findAssetForBusiness(params: {
    assetId: string;
    businessId: Types.ObjectId;
  }) {
    if (!Types.ObjectId.isValid(params.assetId)) {
      throw new BadRequestException('Invalid asset id');
    }

    return this.assetModel
      .findOne({
        _id: new Types.ObjectId(params.assetId),
        $or: [
          { businessId: params.businessId },
          { businessId: params.businessId.toString() },
        ],
      })
      .lean();
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
        .find({
          $or: [{ businessId }, { businessId: businessId.toString() }],
          type: dto.type,
        })
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

    const asset = await this.findAssetForBusiness({
      assetId: dto.assetId,
      businessId,
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (!['video', 'image'].includes(asset.type)) {
      throw new BadRequestException('Only video and image assets can be saved');
    }

    if (!asset.storageKey) {
      throw new NotFoundException('Asset storage key not found');
    }

    // TODO- check limit to see if user can save more assets

    const assetObjectId = new Types.ObjectId(dto.assetId);
    const businessIdString = businessId.toString();

    const originalMediaKey = asset.storageKey;
    const mediaExt = path.extname(originalMediaKey) || '';
    const destinationMediaKey = `saved-ads/${businessIdString}/${assetObjectId.toString()}${mediaExt}`;

    await this.uploadService.copyObject({
      sourceKey: originalMediaKey,
      destinationKey: destinationMediaKey,
      credentials: this.awsCredentials,
    });

    const sizeBytes = await this.uploadService.getObjectSizeBytes(
      destinationMediaKey,
      this.awsCredentials,
    );
    const sizeMb = Number((sizeBytes / (1024 * 1024)).toFixed(2));

    const copiedMediaUrl = this.uploadService.getUrl(destinationMediaKey);

    let destinationThumbnailKey: string | undefined;
    let movedThumbnailUrl: string | undefined;

    if (asset.thumbnailKey) {
      const thumbExt = path.extname(asset.thumbnailKey) || '';
      destinationThumbnailKey = `saved-ads/${businessIdString}/${assetObjectId.toString()}-thumbnail${thumbExt}`;

      await this.uploadService.copyObject({
        sourceKey: asset.thumbnailKey,
        destinationKey: destinationThumbnailKey,
        credentials: this.awsCredentials,
      });

      movedThumbnailUrl = this.uploadService.getUrl(destinationThumbnailKey);
    }

    await this.assetModel.updateOne(
      { _id: assetObjectId, businessId },
      {
        $set: {
          storageKey: destinationMediaKey,
          mediaUrl: copiedMediaUrl,
          thumbnailKey: destinationThumbnailKey,
          thumbnailUrl: movedThumbnailUrl,
          size: sizeBytes,
        },
      },
    );

    const created = await this.savedAssetModel.create({
      businessId,
      assetId: assetObjectId,
      mediaType: asset.type,
      mediaUrl: copiedMediaUrl,
      storageKey: destinationMediaKey,
      sizeBytes,
      sizeMb,
      productId: dto.productId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta,
      caption: dto.caption,
      script: dto.script,
      brandName: dto.brandName,
      websiteUrl: dto.websiteUrl,
    });

    const populated = await this.savedAssetModel.findById(created._id).lean();

    await this.recalculateUserTotalStorage(userId, businessId);

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

    if (deleted.storageKey) {
      await this.uploadService.deleteObject(
        deleted.storageKey,
        this.awsCredentials,
      );
    }

    await this.recalculateUserTotalStorage(userId, businessId);

    return deleted;
  }

  private async recalculateUserTotalStorage(
    userId: Types.ObjectId,
    businessId: Types.ObjectId,
  ) {
    const totalSizeBytesAgg = await this.savedAssetModel.aggregate([
      { $match: { businessId } },
      { $group: { _id: null, total: { $sum: '$sizeBytes' } } },
    ]);

    const totalBytes =
      Array.isArray(totalSizeBytesAgg) && totalSizeBytesAgg.length > 0
        ? Number(totalSizeBytesAgg[0]?.total ?? 0)
        : 0;

    const totalMb = Number((totalBytes / (1024 * 1024)).toFixed(2));
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { memoryUsedInMB: totalMb } },
    );
  }
}
