import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsIn,
  ArrayNotEmpty,
  IsMongoId,
} from 'class-validator';

export class N8nWebhookPayloadDto {
  @ApiProperty({
    example: '66f8f3c8a43b9c001d8d4b22',
    description: 'Unique identifier for the creative set.',
  })
  @IsString()
  creativeSetId: string;

  @ApiProperty({
    example: '6592fbed9f61eb19b2dfbc6f',
    description: 'The ID of the campaign related to this webhook event.',
  })
  @IsMongoId()
  @IsString()
  campaignId: string;

  @ApiProperty({
    example: 'completed',
    description:
      "The status of the webhook event. Can be either 'completed' or 'failed'.",
    enum: ['completed', 'failed'],
  })
  @IsIn(['completed', 'failed'])
  status: 'completed' | 'failed';

  @ApiProperty({
    example: [
      'https://storage.googleapis.com/ad-assets/creative1.png',
      'https://storage.googleapis.com/ad-assets/creative2.png',
    ],
    description:
      'List of creative asset URLs generated or referenced by the webhook.',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  creatives: string[];
}
