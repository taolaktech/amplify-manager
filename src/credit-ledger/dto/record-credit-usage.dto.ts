import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CreditLedgerActionType } from 'src/database/schema/credit-ledger.schema';

export class RecordCreditUsageDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  assetId?: string;

  @ApiProperty({ enum: ['image-gen', 'video-gen', 'ad-copy-gen'] })
  @IsEnum(['image-gen', 'video-gen', 'ad-copy-gen'])
  actionType: CreditLedgerActionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modelUsed: string;

  @ApiProperty({ required: false, default: 0, description: 'Input tokens consumed (text models)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  inputTokens?: number;

  @ApiProperty({ required: false, default: 0, description: 'Output tokens generated (text models)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  outputTokens?: number;

  @ApiProperty({
    required: false,
    description: 'Direct generation cost in USD (image models — overrides token-based calculation)',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  generationCost?: number;

  @ApiProperty({
    required: false,
    description: 'Video duration in seconds (video models — used to calculate cost)',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  videoDurationSeconds?: number;
}
