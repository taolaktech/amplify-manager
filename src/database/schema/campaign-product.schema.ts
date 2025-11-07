// src/campaigns/schemas/campaign-product.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignProductDocument = HydratedDocument<CampaignProduct>;

@Schema({ _id: false })
class Metrics {
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

const MetricsSchema = SchemaFactory.createForClass(Metrics);

@Schema({ timestamps: true })
export class CampaignProduct {
  @Prop({ type: Types.ObjectId, ref: 'campaigns', required: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  googleAdGroupResourceName: string;

  @Prop({ type: MetricsSchema, default: () => {} })
  googleMetrics?: Metrics;

  @Prop()
  googleMetricsLastUpdatedAt: Date;
}

export const CampaignProductSchema =
  SchemaFactory.createForClass(CampaignProduct);
