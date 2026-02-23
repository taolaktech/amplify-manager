import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadVideoPresetRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ type: 'array', required: false, items: { type: 'string' } })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}

export class UploadImagePresetRequestDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ type: 'array', required: false, items: { type: 'string' } })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
