import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery, Types } from 'mongoose';
import { BusinessDoc } from 'src/database/schema';
import { Asset, AssetDoc } from 'src/database/schema/asset.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel('assets') private readonly assetModel: Model<AssetDoc>,
    @InjectModel('business') private readonly businessModel: Model<BusinessDoc>,
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

    const businessId = await this.getBusinessIdForUser(userId);

    const asset = await this.assetModel
      .findOne({ _id: new Types.ObjectId(assetId), businessId })
      .lean<Asset>();

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }
}
