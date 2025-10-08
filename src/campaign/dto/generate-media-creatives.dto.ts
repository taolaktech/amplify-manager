import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  ArrayNotEmpty,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';

export enum Channel {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  GOOGLE = 'GOOGLE',
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
}

export enum SourceType {
  TEMPLATE = 'TEMPLATE',
  MANUAL = 'MANUAL',
}

export class GenerateMediaCreativesDto {
  @ApiProperty({
    description: 'Unique ID of the business',
    example: '682a2ca8bcf5df0ad7632a77',
  })
  @IsNotEmpty()
  @IsMongoId()
  businessId: string;

  @ApiProperty({
    description: 'Name of the product',
    example: 'SIMONE PANTS SET',
  })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({
    description: 'Description of the product',
    example:
      'Make a bold statement with the Simone Two-Piece Set, featuring our iconic Simone Print in vibrant Orange and Neon Navy. Designed to celebrate individuality and self-expression, this set is perfect for turning heads.',
  })
  @IsNotEmpty()
  @IsString()
  productDescription: string;

  @ApiProperty({
    description: 'Key product features',
    example: ['top', 'pants', 'Wide leg pants'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  productFeatures: string[];

  @ApiProperty({
    description: 'Name of the brand',
    example: 'Mohala Grey',
  })
  @IsNotEmpty()
  @IsString()
  brandName: string;

  @ApiProperty({
    description: 'Marketing channel where the asset will be used',
    example: 'INSTAGRAM',
    enum: Channel,
  })
  @IsNotEmpty()
  @IsEnum(Channel)
  channel: Channel;

  @ApiProperty({
    description: 'Array of product image URLs',
    example: [
      'https://mohalagrey.com/cdn/shop/files/SimoneSet3_1220x_crop_center.png',
      'https://mohalagrey.com/cdn/shop/files/SimoneSet4_1220x_crop_center.png',
      'https://mohalagrey.com/cdn/shop/files/SimoneSet2_1220x_crop_center.png',
      'https://mohalagrey.com/cdn/shop/files/SimoneSet_b6498d63-db98-4d7b-8a7e-e43cbf8906bf_1220x_crop_center.png',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  productImages: string[];

  @ApiProperty({
    description: 'Type of creative asset',
    example: 'IMAGE',
    enum: AssetType,
  })
  @IsNotEmpty()
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({
    description: 'Category of the product',
    example: 'dress',
  })
  @IsNotEmpty()
  @IsString()
  productCategory: string;

  @ApiProperty({
    description: 'Brand tone or style of the creative',
    example: 'bold',
  })
  @IsNotEmpty()
  @IsString()
  tone: string;

  @ApiProperty({
    description: 'Primary brand color in RGBA format',
    example: 'rgba(154, 78, 145, 0.8)',
  })
  @IsNotEmpty()
  @IsString()
  brandColor: string;

  @ApiProperty({
    description: 'Accent brand color (e.g., hex code)',
    example: '#fff',
  })
  @IsNotEmpty()
  @IsString()
  brandAccent: string;

  @ApiProperty({
    description: 'Website or domain of the brand',
    example: 'mohalagrey.com',
  })
  @IsNotEmpty()
  @IsString()
  siteUrl: string;

  @ApiProperty({
    description: 'Source of the creative asset',
    example: 'TEMPLATE',
    enum: SourceType,
  })
  @IsNotEmpty()
  @IsEnum(SourceType)
  source: SourceType;
}
