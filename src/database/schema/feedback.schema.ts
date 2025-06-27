import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';

export type FeedBackDoc = HydratedDocument<Feedback>;

export enum WhatCanBeImproved {
  GENERAL_EXPERIENCE = 'General experience',
  REPORT_BUG = 'Report a bug',
  FEATURE_REQUEST = 'Feature request',
  SOMETHING_FELT_OFF = 'Something felt off',
}

export enum FeedBackRating {
  TERRIBLE = 1,
  MEH = 2,
  OK = 3,
  GOOD = 4,
  AMAZING = 5,
}

@Schema({
  timestamps: true,
  collection: 'feedbacks',
  versionKey: false,
})
export class Feedback extends Document {
  @Prop({
    type: mongoose.Types.ObjectId,
    required: true,
    ref: 'users',
    index: true,
  })
  belongsTo!: mongoose.Types.ObjectId;

  @Prop({
    type: String,
    minlength: [10, 'Feedback note must be at least 10 characters long'],
    maxlength: [500, 'Feedback note cannot exceed 500 characters'],
    trim: true,
    required: false,
  })
  feedbackNote?: string;

  @Prop({
    type: Number,
    enum: {
      values: Object.values(FeedBackRating),
      message: 'Rating must be between 1 and 5',
    },
    required: [true, 'Rating is required'],
    index: true,
  })
  rating!: FeedBackRating;

  @Prop({
    type: String,
    enum: {
      values: Object.values(WhatCanBeImproved),
      message: 'Invalid improvement category',
    },
    required: false,
    index: true,
  })
  improvementCategory: WhatCanBeImproved;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Add compound indexes for better query performance
FeedbackSchema.index({ belongsTo: 1, createdAt: -1 });
FeedbackSchema.index({ rating: 1, improvementCategory: 1 });
FeedbackSchema.index({ isResolved: 1, createdAt: -1 });
