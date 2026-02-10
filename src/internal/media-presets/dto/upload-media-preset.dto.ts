import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadVideoPresetRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}

export class UploadImagePresetRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ required: true })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
