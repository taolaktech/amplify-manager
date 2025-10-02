import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Document, Types } from 'mongoose';

export type GoogleAdsCampaignDoc = HydratedDocument<GoogleAdsCampaign>;

@Schema({ _id: false })
class AdGroupAd {
  @Prop()
  resourceName: string;

  @Prop()
  name: string;

  @Prop()
  status: string;
}

const AdGroupAdSchema = SchemaFactory.createForClass(AdGroupAd);

@Schema({ _id: false })
class AdGroup {
  @Prop()
  resourceName: string;

  @Prop()
  name: string;

  @Prop()
  type: string;

  @Prop()
  status: string;

  @Prop({ type: [AdGroupAdSchema], default: [] })
  ads: AdGroupAd[];
}

const AdGroupSchema = SchemaFactory.createForClass(AdGroup);

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
export class GoogleAdsCampaign extends Document {
  @Prop({ type: Types.ObjectId, ref: 'campaigns', required: true })
  campaign: Types.ObjectId;

  @Prop()
  campaignResourceName: string;

  @Prop()
  campaignName: string;

  @Prop()
  campaignType: string;

  @Prop()
  campaignStatus: string;

  @Prop()
  budgetResourceName: string;

  @Prop()
  budgetAmountMicros: number;

  @Prop()
  biddingStrategyResourceName: string;

  @Prop()
  biddingStrategyType: string;

  @Prop({ type: [AdGroupSchema], default: [] })
  adGroups: AdGroup[];

  @Prop({ default: false })
  keywordsAddedToAdGroups: boolean;

  @Prop({ default: false })
  geotargetingAddedToCampaign: boolean;

  @Prop({ default: false })
  allStepsCompleted: boolean;

  @Prop({ type: MetricsSchema, default: () => {} })
  metrics?: Metrics;

  @Prop()
  metricsLastUpdatedAt: Date;
}

export const GoogleAdsCampaignSchema =
  SchemaFactory.createForClass(GoogleAdsCampaign);
