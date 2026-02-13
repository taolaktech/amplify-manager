import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
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
