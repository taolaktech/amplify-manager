import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsMongoId,
  IsArray,
  ArrayNotEmpty,
  IsUrl,
  IsBoolean,
} from 'class-validator';

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
}
