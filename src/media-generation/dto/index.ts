import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsMongoId,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
  IsUrl,
} from 'class-validator';

export class InitiateImageGenWithN8n {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  mediaPresetId?: string;

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

export class InitiateVideoGenerationDto {
  @ApiProperty({ description: 'Video preset id (MongoDB ObjectId)' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  videoPresetId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productCategory: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;
}

export class InitiateImageGenerationDto {
  @ApiProperty({ description: 'Image preset id (MongoDB ObjectId)' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  imagePresetId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productCategory: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productImage: string;

  // field for other images
  @ApiProperty({ required: false, type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherImages?: string[];
}
