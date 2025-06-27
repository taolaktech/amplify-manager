import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedBackDoc } from 'src/database/schema/feedback.schema';
import {
  CreateFeedbackDto,
  improvementCategoryMap,
} from './dtos/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectModel('feedbacks')
    private feedBackModel: Model<FeedBackDoc>,
  ) {}

  async createFeedback(userId: Types.ObjectId, feedback: CreateFeedbackDto) {
    try {
      const transformedData = {
        belongsTo: userId,
        rating: feedback.rating,
        ...(feedback.feedbackNote
          ? { feedbackNote: feedback.feedbackNote }
          : {}),
        ...(feedback.improvementCategory
          ? {
              improvementCategory:
                improvementCategoryMap[feedback.improvementCategory],
            }
          : {}),
      };

      const newFeedback = new this.feedBackModel(transformedData);

      const createdFeedback = await newFeedback.save();

      this.logger.log(`::: Successfully created feedback :::`);

      return createdFeedback;
    } catch (error) {
      this.logger.error(
        `::: Error creating feedback: ${error.message}`,
        error.stack,
      );

      const message = error?.message ?? 'Something went wrong';

      throw new BadRequestException(message);
    }
  }
}
