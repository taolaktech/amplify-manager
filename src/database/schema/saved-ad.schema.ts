import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedAdDoc = SavedAd & Document;

@Schema({ timestamps: true })
export class SavedAd {
  @Prop({ type: Types.ObjectId, ref: 'business', required: true, index: true })
  businessId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'assets', required: true, index: true })
  assetId: Types.ObjectId;

  @Prop({ required: false, index: true })
  productId?: string;

  @Prop({ required: false, index: true })
  productTitle?: string;

  @Prop({ required: false, index: true })
  productHandle?: string;

  @Prop({ required: false, index: true })
  productType?: string;

  @Prop({ required: false, index: true })
  productCategory?: string;

  @Prop({ required: false })
  productImageUrl?: string;

  @Prop({ type: [String], required: false, index: true })
  productTags?: string[];

  @Prop({ required: false })
  mediaUrl?: string;

  @Prop({ required: false })
  mediaType?: string;

  @Prop({ required: false })
  storageKey?: string;

  @Prop({ required: false })
  sizeBytes?: number;

  @Prop({ required: false })
  sizeMb?: number;

  @Prop()
  headline?: string;

  @Prop()
  bodyCopy?: string;

  @Prop()
  cta?: string;

  @Prop()
  caption?: string;

  @Prop()
  script?: string;

  @Prop()
  brandName?: string;

  @Prop()
  websiteUrl?: string;
}

export const SavedAdSchema = SchemaFactory.createForClass(SavedAd);
