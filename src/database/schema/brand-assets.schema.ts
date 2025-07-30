import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';

export type BrandAssetDoc = HydratedDocument<BrandAsset>;

@Schema({
  timestamps: true,
})
export class BrandAsset extends Document {
  @Prop({
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'users',
    index: true,
  })
  belongsTo!: mongoose.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  primaryColor: string;

  @Prop({
    type: String,
    required: true,
  })
  secondaryColor: string;

  @Prop({
    type: String,
    required: true,
  })
  primaryFont: string;

  @Prop({
    type: String,
    required: true,
  })
  secondaryFont: string;

  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  primaryLogoUrl?: string;

  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  primaryLogoName?: string;

  @Prop({
    type: String,
    required: false,
  })
  primaryLogoKey?: string;

  @Prop({
    type: String,
    required: false,
  })
  primaryLogoMimeType?: string;

  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  secondaryLogoUrl?: string;

  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  secondaryLogoName?: string;

  @Prop({
    type: String,
    required: false,
  })
  secondaryLogoKey?: string;

  @Prop({
    type: String,
    required: false,
  })
  secondaryLogoMimeType?: string;

  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  brandGuideUrl?: string;
  @Prop({
    type: String,
    required: false, // Changed to false, as it might not be provided
  })
  brandGuideName?: string;

  @Prop({
    type: String,
    required: false,
  })
  brandGuideKey?: string;

  @Prop({
    type: String,
    required: false,
  })
  brandGuideMimeType?: string;
}

export const BrandAssetSchema = SchemaFactory.createForClass(BrandAsset);
