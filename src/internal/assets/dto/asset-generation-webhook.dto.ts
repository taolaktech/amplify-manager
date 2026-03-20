import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssetGenerationWebhookDto {
  @ApiProperty({
    example: '66f8f3c8a43b9c001d8d4b22',
    description: 'The asset id (used as idempotency key).',
  })
  @IsMongoId()
  @IsString()
  assetId: string;

  @ApiProperty({
    example: 'completed',
    enum: ['completed', 'failed'],
  })
  @IsIn(['completed', 'failed'])
  status: 'completed' | 'failed';

  @ApiProperty({
    example: 'image_ad_generation',
    enum: [
      'video_copy_generation',
      'image_copy_generation',
      'google_ad_generation',
      'image_ad_generation',
      'video_generation_12s',
    ],
  })
  @IsIn([
    'video_copy_generation',
    'image_copy_generation',
    'google_ad_generation',
    'image_ad_generation',
    'video_generation_12s',
  ])
  kind:
    | 'video_copy_generation'
    | 'image_copy_generation'
    | 'google_ad_generation'
    | 'image_ad_generation'
    | 'video_generation_12s';

  @ApiPropertyOptional({ example: 'gpt-image-1' })
  @IsOptional()
  @IsString()
  modelUsed?: string;

  @ApiPropertyOptional({ example: 'gpt-4o-mini-2024-07-18' })
  @IsOptional()
  @IsString()
  modelVersion?: string;

  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsNumber()
  inputTokens?: number;

  @ApiPropertyOptional({ example: 456 })
  @IsOptional()
  @IsNumber()
  outputTokens?: number;
}
