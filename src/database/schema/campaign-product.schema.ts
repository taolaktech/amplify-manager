// src/campaigns/schemas/campaign-product.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignProductDoc = HydratedDocument<CampaignProduct>;

@Schema({ _id: false })
class GoogleMetrics {
  @Prop({ default: '0' })
  clicks: string;

  @Prop({ default: 0 })
  conversionsValue: number;

  @Prop({ default: 0 })
  conversions: number;

  @Prop({ default: '0' })
  costMicros: string;

  @Prop({ default: '0' })
  impressions: string;
}

const GoogleMetricsSchema = SchemaFactory.createForClass(GoogleMetrics);

@Schema({ timestamps: true })
export class CampaignProduct {
  @Prop({ type: Types.ObjectId, ref: 'campaigns', required: true })
  campaignId: Types.ObjectId;

  @Prop({ required: true })
  productId: string;

  @Prop()
  googleAdGroupResourceName?: string;

  @Prop({ type: GoogleMetricsSchema, default: () => {} })
  googleMetrics?: GoogleMetrics;

  @Prop()
  googleMetricsLastUpdatedAt?: Date;
}

export const CampaignProductSchema =
  SchemaFactory.createForClass(CampaignProduct);
