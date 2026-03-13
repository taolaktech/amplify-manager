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
