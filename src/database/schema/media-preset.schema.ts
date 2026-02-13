import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MediaPresetDoc = HydratedDocument<MediaPreset>;

@Schema({ timestamps: true })
export class MediaPreset {
  @Prop()
  label: string;

  @Prop()
  mediaUrl: string;

  @Prop({ type: String, enum: ['image', 'video'], required: true })
  type: 'image' | 'video';

  @Prop()
  mediaKey: string;

  @Prop()
  thumbnailUrl: string;

  @Prop()
  thumbnailKey: string;

  @Prop({ required: false })
  duration?: number;

  @Prop({ type: String, required: false })
  resolution?: string;

  @Prop({ type: String, required: true })
  prompt: string;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const MediaPresetSchema = SchemaFactory.createForClass(MediaPreset);
