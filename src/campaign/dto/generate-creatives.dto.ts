import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export enum Channel {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
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
    description: 'Name of the product',
    example: 'SIMONE PANTS SET',
  })
  @IsNotEmpty()
  @IsString()
  productName: string;

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
    description: 'The type of campaign',
  })
  @IsNotEmpty()
  @IsString()
  campaignType: string;

  @ApiProperty({
    description: 'Type of creative asset',
    example: 'IMAGE',
    enum: AssetType,
  })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({
    description: 'Description of the product',
    example:
      'Make a bold statement with the Simone Two-Piece Set, featuring our iconic Simone Print in vibrant Orange and Neon Navy. Designed to celebrate individuality and self-expression, this set is perfect for turning heads.',
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiProperty({
    description: 'Category of the product',
    example: 'dress',
  })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiProperty({
    description: 'Brand tone or style of the creative',
    example: 'bold',
  })
  @IsNotEmpty()
  @IsOptional()
  tone?: string;

  @ApiProperty({
    description: 'Primary brand color in RGBA format',
    example: 'rgba(154, 78, 145, 0.8)',
  })
  @IsOptional()
  @IsString()
  brandColor?: string;

  @ApiProperty({
    description: 'Accent brand color (e.g., hex code)',
    example: '#fff',
  })
  @IsOptional()
  @IsString()
  brandAccent?: string;

  @ApiProperty({
    description: 'Website or domain of the brand',
    example: 'https://mohalagrey.com',
  })
  @IsOptional()
  @IsString()
  siteUrl?: string;
}

export class GenerateGoogleCreativesDto {
  @ApiProperty({
    example: 'SIMONE PANTS SET',
    description: 'The name of the product being advertised.',
  })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({
    example: '$89.99',
    description: 'The price of the product as displayed in the ad.',
  })
  @IsNotEmpty()
  @IsString()
  productPrice: string;

  @ApiProperty({
    example:
      'Make a bold statement with the Simone Two-Piece Set, featuring our iconic Simone Print in vibrant Orange and Neon Navy.',
    description: 'Detailed description of the product.',
  })
  @IsNotEmpty()
  @IsString()
  productDescription: string;

  @ApiProperty({
    example: 'Casual outings, brunch, or vacations',
    description: 'The main occasion or use case for the product.',
  })
  @IsNotEmpty()
  @IsString()
  productOccasion: string;

  @ApiProperty({
    example: ['Two-piece set', 'Breathable fabric', 'Vibrant print'],
    description: 'Key product features that highlight selling points.',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  productFeatures: string[];

  @ApiProperty({
    example: 'Friendly and engaging',
    description: 'The tone or voice to use when generating creative assets.',
  })
  @IsNotEmpty()
  @IsString()
  tone: string;

  @ApiProperty({
    example: 'Women’s Fashion',
    description: 'The category the product belongs to.',
  })
  @IsNotEmpty()
  @IsString()
  productCategory: string;

  @ApiProperty({
    example: 'SIMONE LABEL',
    description: 'The name of the brand associated with the product.',
  })
  @IsNotEmpty()
  @IsString()
  brandName: string;

  @ApiProperty({
    example: 'Google',
    description:
      'The ad channel where this creative will be used (e.g., Google, Meta, TikTok).',
  })
  @IsNotEmpty()
  @IsString()
  channel: string;

  @ApiProperty({
    example: 'https://example.com/images/simone-pants-set.jpg',
    description: 'URL of the product image to be used in the creative.',
  })
  @IsNotEmpty()
  @IsUrl()
  productImage: string;

  @ApiProperty({
    example: 'https://example.com/products/simone-pants-set',
    description: 'Direct link to the product page.',
  })
  @IsNotEmpty()
  @IsUrl()
  productLink: string;

  @ApiProperty({
    example: 'Performance Max',
    description:
      'The campaign type under which this creative will be generated.',
  })
  @IsNotEmpty()
  @IsString()
  campaignType: string;
}
