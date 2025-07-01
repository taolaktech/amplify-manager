import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  FeedBackRating,
  WhatCanBeImproved,
} from 'src/database/schema/feedback.schema';

// Enum keys for API requests
export enum WhatCanBeImprovedKeys {
  GENERAL_EXPERIENCE = 'GENERAL_EXPERIENCE',
  REPORT_BUG = 'REPORT_BUG',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  SOMETHING_FELT_OFF = 'SOMETHING_FELT_OFF',
}

// Mapping from keys to values
export const improvementCategoryMap = {
  [WhatCanBeImprovedKeys.GENERAL_EXPERIENCE]:
    WhatCanBeImproved.GENERAL_EXPERIENCE,
  [WhatCanBeImprovedKeys.REPORT_BUG]: WhatCanBeImproved.REPORT_BUG,
  [WhatCanBeImprovedKeys.FEATURE_REQUEST]: WhatCanBeImproved.FEATURE_REQUEST,
  [WhatCanBeImprovedKeys.SOMETHING_FELT_OFF]:
    WhatCanBeImproved.SOMETHING_FELT_OFF,
};

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'User rating for the experience',
    enum: FeedBackRating,
    enumName: 'FeedBackRating',
    example: FeedBackRating.GOOD,
    type: 'number',
  })
  @IsEnum(FeedBackRating)
  @IsNotEmpty()
  rating: FeedBackRating;

  @ApiProperty({
    description: 'Category of what can be improved',
    enum: WhatCanBeImprovedKeys,
    enumName: 'WhatCanBeImprovedKeys',
    example: WhatCanBeImprovedKeys.GENERAL_EXPERIENCE,
    required: false,
  })
  @IsEnum(WhatCanBeImprovedKeys)
  @IsOptional()
  improvementCategory?: WhatCanBeImprovedKeys;

  @ApiProperty({
    description: 'Detailed feedback note from the user',
    minLength: 10,
    maxLength: 500,
    example:
      'The application works great! I especially love the user interface design and how intuitive it is to navigate.',
    required: false,
  })
  @IsString()
  @Length(10, 500)
  @IsOptional()
  feedbackNote?: string;
}
