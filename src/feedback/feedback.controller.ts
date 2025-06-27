import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dtos/create-feedback.dto';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('/api/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({
    summary: 'Create user feedback',
    description:
      'Submit feedback with rating, improvement category, and optional notes',
  })
  @ApiBody({
    type: CreateFeedbackDto,
    description: 'Feedback data',
    examples: {
      positiveReview: {
        summary: 'Positive Feedback',
        description: 'Example of positive user feedback',
        value: {
          rating: 5,
          improvementCategory: 'GENERAL_EXPERIENCE',
          feedbackNote:
            'The application works perfectly! I love the intuitive interface and the seamless integration with Shopify. Keep up the excellent work!',
        },
      },
      bugReport: {
        summary: 'Bug Report',
        description: 'Example of bug report feedback',
        value: {
          rating: 2,
          improvementCategory: 'REPORT_BUG',
          feedbackNote:
            'I encountered an issue where the product sync fails intermittently. The error message is not very descriptive, making it hard to troubleshoot.',
        },
      },
      featureRequest: {
        summary: 'Feature Request',
        description: 'Example of feature request feedback',
        value: {
          rating: 4,
          improvementCategory: 'FEATURE_REQUEST',
          feedbackNote:
            'Great app overall! Would love to see bulk product editing capabilities and better inventory management features in the next update.',
        },
      },
      minimal: {
        summary: 'Minimal Feedback',
        description: 'Minimal required fields only',
        value: {
          rating: 4,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Feedback created successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Feedback created successfully',
        },
        data: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            belongsTo: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
            },
            rating: {
              type: 'number',
              example: 5,
            },
            improvementCategory: {
              type: 'string',
              example: 'GENERAL_EXPERIENCE',
            },
            feedbackNote: {
              type: 'string',
              example: 'Great experience using the app!',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          example: 400,
        },
        message: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'rating must be a valid enum value',
            'feedbackNote must be longer than or equal to 10 characters',
          ],
        },
        error: {
          type: 'string',
          example: 'Bad Request',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async createFeedback(
    @GetUser() user: UserDoc,
    @Body() feedbackDto: CreateFeedbackDto,
  ) {
    const createdFeedback = await this.feedbackService.createFeedback(
      user._id,
      feedbackDto,
    );

    return {
      success: true,
      message: 'Feedback created successfully',
      data: createdFeedback,
    };
  }
}
