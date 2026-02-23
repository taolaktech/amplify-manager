import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsMongoId,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
} from 'class-validator';

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
  productId: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productCategory: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  productImages: string[];

  @IsString()
  @IsOptional()
  headline?: string;

  @IsString()
  @IsOptional()
  bodyCopy?: string;

  @IsString()
  @IsOptional()
  cta?: string;
}
