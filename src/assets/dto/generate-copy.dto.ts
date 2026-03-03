import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
  IsNumber,
  Min,
} from 'class-validator';

export class GenerateVideoScriptDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  productImages?: string[];

  @ApiProperty({ required: false, description: 'Label or name of the video preset/template' })
  @IsOptional()
  @IsString()
  presetLabel?: string;

  @ApiProperty({ required: false, description: 'Target duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  presetDuration?: number;

  @ApiProperty({ required: false, description: 'Video resolution e.g. 1080x1920' })
  @IsOptional()
  @IsString()
  presetResolution?: string;
}

export class GenerateImageAdCopyDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  productDescription: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  productImages?: string[];

  @ApiProperty({ required: false, description: 'Label or name of the image preset/template' })
  @IsOptional()
  @IsString()
  presetLabel?: string;

  @ApiProperty({ required: false, description: 'Image resolution e.g. 1080x1080' })
  @IsOptional()
  @IsString()
  presetResolution?: string;
}
