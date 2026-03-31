import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsMongoId,
  IsArray,
  ArrayNotEmpty,
  IsUrl,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InitiateImageGenerationDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsMongoId()
  @IsOptional()
  imagePresetId?: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  productImages: string[];

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  headline: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  bodyCopy: string;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  cta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}

const GENERATION_KINDS = [
  'video_copy_generation',
  'image_copy_generation',
  'google_ad_generation',
  'image_ad_generation',
  'video_generation_12s',
] as const;

export class PreflightGenerationItemDto {
  @ApiProperty({ enum: GENERATION_KINDS })
  @IsString()
  @IsIn(GENERATION_KINDS as unknown as string[])
  kind:
    | 'video_copy_generation'
    | 'image_copy_generation'
    | 'google_ad_generation'
    | 'image_ad_generation'
    | 'video_generation_12s';

  @ApiProperty({ minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  count: number;
}

export class PreflightMultiGenerationDto {
  @ApiProperty({ type: [PreflightGenerationItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PreflightGenerationItemDto)
  items: PreflightGenerationItemDto[];
}

export class GenerateCopyDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  productImages: string[];

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsOptional()
  productCategory?: string;

  @ApiProperty({ required: true })
  @IsMongoId()
  mediaPresetId: string;
}

export class InitiateVideoGenerationDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsMongoId()
  @IsOptional()
  videoPresetId?: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  productImages: string[];

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsOptional()
  script?: string;

  @ApiProperty({ required: true, default: true })
  @IsBoolean()
  includeMusic: boolean;

  @ApiProperty({ required: true, default: true })
  @IsBoolean()
  includeVoiceOver: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}

export class RegenerateImageDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  productImages: string[];

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  headline: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  bodyCopy: string;

  @ApiProperty({ required: false, default: '' })
  @IsOptional()
  @IsString()
  cta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}
