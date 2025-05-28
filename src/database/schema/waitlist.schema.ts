import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WaitlistDoc = HydratedDocument<Waitlist>;

@Schema({ timestamps: true })
export class Waitlist {
  @Prop()
  email: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);
