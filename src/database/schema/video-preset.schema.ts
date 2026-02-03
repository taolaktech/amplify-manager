import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoPresetDoc = VideoPreset & Document;

@Schema({ timestamps: true })
export class VideoPreset {
  @Prop({ required: true })
  videoUrl: string;

  @Prop({ required: true })
  videoKey: string;

  @Prop({ required: true })
  thumbnailImageUrl: string;

  @Prop({ required: true })
  thumbnailImageKey: string;

  @Prop({ required: true })
  thumbnailVideoUrl: string;

  @Prop({ required: true })
  thumbnailVideoKey: string;

  @Prop({ required: false })
  duration?: number;

  @Prop({ type: String, required: false })
  resolution?: string;
}

export const VideoPresetSchema = SchemaFactory.createForClass(VideoPreset);
