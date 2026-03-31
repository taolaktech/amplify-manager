import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSavedAdDto {
  @ApiProperty({ description: 'Asset id to save' })
  @IsMongoId()
  assetId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false, description: 'Product title at save-time' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  productTitle?: string;

  @ApiProperty({ required: false, description: 'Product handle at save-time' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  productHandle?: string;

  @ApiProperty({ required: false, description: 'Product type at save-time' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  productType?: string;

  @ApiProperty({
    required: false,
    description: 'Product category at save-time',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  productCategory?: string;

  @ApiProperty({
    required: false,
    description: 'Primary product image URL at save-time',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productImageUrl?: string;

  @ApiProperty({
    required: false,
    description: 'Product tags at save-time',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  productTags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  headline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bodyCopy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cta?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  script?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customPrompt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;
}
