import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdLibraryDoc = HydratedDocument<AdLibrary>;

@Schema({
  timestamps: true,
  collection: 'ad-library',
  versionKey: false,
})
export class AdLibrary {
  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: [String], default: [] })
  platforms?: string[];

  @Prop({ type: Number })
  impressions?: number;

  @Prop({ type: Object })
  euTransparency?: Record<string, any>;

  @Prop({ type: String, index: true })
  libraryId?: string;
}

export const AdLibrarySchema = SchemaFactory.createForClass(AdLibrary);
