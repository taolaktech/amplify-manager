import { ApiProperty } from '@nestjs/swagger';

export class UploadVideoRequestDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}
