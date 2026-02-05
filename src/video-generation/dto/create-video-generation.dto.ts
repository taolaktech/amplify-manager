import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateVideoGenerationDto {
  @ApiProperty({ description: 'Campaign id (MongoDB ObjectId)' })
  @IsOptional()
  @IsMongoId()
  campaignId?: string;

  @ApiProperty({ description: 'Video preset id (MongoDB ObjectId)' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  videoPresetId: string;
}

// @ApiProperty({ description: 'Prompt for video generation' })
// @IsString()
// prompt: string;

// @ApiProperty({
//   required: false,
//   enum: ['sora-2', 'sora-2-pro'],
//   default: 'sora-2',
// })
// @IsOptional()
// @IsIn(['sora-2', 'sora-2-pro'])
// model?: 'sora-2' | 'sora-2-pro';

// @ApiProperty({ required: false, enum: ['4', '8', '12'], default: '8' })
// @IsOptional()
// @IsIn(['4', '8', '12'])
// seconds?: '4' | '8' | '12';

// @ApiProperty({
//   required: false,
//   example: '1280x720',
//   description: 'Resolution formatted as widthxheight',
// })
// @IsOptional()
// @IsString()
// size?: string;

// @ApiProperty({
//   required: false,
//   enum: ['standard', 'high'],
//   default: 'standard',
// })
// @IsOptional()
// @IsIn(['standard', 'high'])
// quality?: 'standard' | 'high';
