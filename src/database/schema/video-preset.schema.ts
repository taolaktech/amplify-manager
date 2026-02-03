import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoPresetDoc = VideoPreset & Document;

@Schema({ timestamps: true })
export class VideoPreset {
  @Prop()
  label: string;

  @Prop()
  videoUrl: string;

  @Prop()
  videoKey: string;

  @Prop()
  thumbnailImageUrl: string;

  @Prop()
  thumbnailImageKey: string;

  @Prop()
  thumbnailVideoUrl: string;

  @Prop()
  thumbnailVideoKey: string;

  @Prop({ required: false })
  duration?: number;

  @Prop({ type: String, required: false })
  resolution?: string;
}

export const VideoPresetSchema = SchemaFactory.createForClass(VideoPreset);
