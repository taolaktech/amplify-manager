import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdLibraryDoc = HydratedDocument<AdLibrary>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class AdLibrary {
  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: [String], default: [] })
  platforms?: string[];

  @Prop({ type: Number })
  impressions?: number;

  @Prop({ type: String, index: true })
  libraryId?: string;
}

export const AdLibrarySchema = SchemaFactory.createForClass(AdLibrary);
