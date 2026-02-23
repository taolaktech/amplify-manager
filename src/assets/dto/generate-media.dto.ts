import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsMongoId,
  IsArray,
  ArrayNotEmpty,
  IsUrl,
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

export class RegenerateImageDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  assetId: string;

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
