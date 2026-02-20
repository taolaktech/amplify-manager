import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadVideoPresetRequestDto {
  @ApiProperty({ required: true })
  @IsString()
  @IsOptional()
  label?: string;

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
  @IsOptional()
  label?: string;

  @ApiProperty({ type: 'array', items: { type: 'string' } })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
