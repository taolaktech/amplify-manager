import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CreditLedgerDocument = HydratedDocument<CreditLedger>;

export type CreditLedgerActionType = 'image-gen' | 'video-gen' | 'ad-copy-gen';

@Schema({ timestamps: true })
export class CreditLedger {
  @Prop({
    type: Types.ObjectId,
    ref: 'users',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'assets',
    required: false,
  })
  assetId?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ['image-gen', 'video-gen', 'ad-copy-gen'],
    index: true,
  })
  actionType: CreditLedgerActionType;

  @Prop({
    type: String,
    required: true,
  })
  modelUsed: string;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  inputTokens: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  outputTokens: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  totalApiCostUsd: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  creditsUsed: number;
}

export const CreditLedgerSchema = SchemaFactory.createForClass(CreditLedger);
