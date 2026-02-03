import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetDoc = Asset & Document;

export type AssetType = 'image' | 'video';
export type AssetSource = 'generated' | 'uploaded';

@Schema({ timestamps: true })
export class Asset {
  @Prop({ type: Types.ObjectId, ref: 'business', required: true, index: true })
  businessId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'campaigns',
    required: false,
    default: null,
    index: true,
  })
  campaignId?: Types.ObjectId | null;

  @Prop({ required: false, index: true })
  productId?: string;

  @Prop({ required: true, enum: ['image', 'video'], index: true })
  type: AssetType;

  @Prop({ required: true, enum: ['generated', 'uploaded'], index: true })
  source: AssetSource;

  @Prop()
  url?: string;

  @Prop()
  storageUrl?: string;

  @Prop()
  storageKey?: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  thumbnailKey?: string;

  @Prop()
  duration?: number;

  @Prop({ type: String })
  resolution?: string;

  @Prop()
  destinationUrl?: string;

  @Prop()
  promptUsed?: string;

  @Prop()
  headlineUsed?: string;

  @Prop()
  descriptionUsed?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

// Enforce dedupe within a campaign
AssetSchema.index(
  {
    businessId: 1,
    campaignId: 1,
    productId: 1,
    type: 1,
    source: 1,
    url: 1,
    storageUrl: 1,
  },
  {
    unique: true,
    partialFilterExpression: { campaignId: { $type: 'objectId' } },
  },
);

// Enforce dedupe for draft assets (no campaignId yet)
AssetSchema.index(
  {
    businessId: 1,
    campaignId: 1,
    productId: 1,
    type: 1,
    source: 1,
    url: 1,
    storageUrl: 1,
  },
  {
    unique: true,
    partialFilterExpression: { campaignId: null },
  },
);
