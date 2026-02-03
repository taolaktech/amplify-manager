import { ApiProperty } from '@nestjs/swagger';

export class UploadVideoPresetRequestDto {
  @ApiProperty({ required: true })
  label: string;

  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
