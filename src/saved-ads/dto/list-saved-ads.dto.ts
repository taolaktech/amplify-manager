import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListSavedAdsDto {
  @ApiProperty({
    description: 'The page number to retrieve.',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'The number of items to return per page.',
    default: 12,
    required: false,
    name: 'perPage',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 12;

  @ApiProperty({
    required: false,
    description: 'Filter by one or more productIds',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  productIds?: string[];

  @ApiProperty({
    required: false,
    description: 'Filter by asset type (image or video)',
    enum: ['image', 'video'],
  })
  @IsOptional()
  @IsIn(['image', 'video'])
  type?: 'image' | 'video';

  @ApiProperty({
    required: false,
    description: 'Filter by tag keywords (matched against copy fields)',
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiProperty({
    required: false,
    description: 'Filter from date (ISO string)',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    required: false,
    description: 'Filter to date (ISO string)',
  })
  @IsOptional()
  @IsString()
  to?: string;
}
