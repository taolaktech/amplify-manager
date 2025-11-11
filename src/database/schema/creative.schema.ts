import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CreativeDoc = Creative & Document;

@Schema({ _id: false })
export class CreativeItem {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  productUrl: string;

  @Prop()
  caption?: string;

  @Prop()
  title?: string;

  @Prop()
  bodyText?: string;

  @Prop()
  description?: string;

  @Prop()
  url?: string;
}

export const CreativeItemSchema = SchemaFactory.createForClass(CreativeItem);

@Schema({ timestamps: true })
export class Creative {
  @Prop({ required: true, unique: true })
  creativeSetId: string;

  @Prop({ ref: 'business', type: Types.ObjectId })
  businessId: Types.ObjectId;

  @Prop({ required: true })
  campaignId: string;

  @Prop({
    required: true,
    enum: ['completed', 'failed', 'pending'],
  })
  status: 'completed' | 'failed' | 'pending';

  @Prop({ type: [CreativeItemSchema], default: [] })
  creatives: CreativeItem[];
}

export const CreativeSchema = SchemaFactory.createForClass(Creative);
