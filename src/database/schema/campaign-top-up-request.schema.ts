import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignTopUpRequestDoc = HydratedDocument<CampaignTopUpRequest>;

@Schema({ timestamps: true })
export class CampaignTopUpRequest {
  @Prop({ type: Types.ObjectId, ref: 'campaigns', required: true })
  campaignId: string;

  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  userId: string;

  @Prop({ type: Number, required: true })
  amountInCents: number;

  @Prop({
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  })
  status: string;

  // This will link to the transaction record in the wallet service
  @Prop({ type: String })
  walletTransactionId?: string;
}

export const CampaignTopUpRequestSchema =
  SchemaFactory.createForClass(CampaignTopUpRequest);
