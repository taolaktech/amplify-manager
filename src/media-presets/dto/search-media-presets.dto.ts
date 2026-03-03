import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMediaPresetsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perPage?: number;

  @ApiPropertyOptional({ enum: ['image', 'video'], example: 'video' })
  @IsOptional()
  @IsString()
  @IsIn(['image', 'video'])
  type?: 'image' | 'video';

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by tags (OR logic within group)',
    example: ['Summer', 'Trending'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by creative directions (OR logic within group)',
    example: ['Testimonials', 'Problem → Solution'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  creativeDirections?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by niches (OR logic within group)',
    example: ['Beauty & Skincare', 'Fashion & Apparel'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niches?: string[];
}
