import { ApiProperty } from '@nestjs/swagger';

export class UploadVideoPresetRequestDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
