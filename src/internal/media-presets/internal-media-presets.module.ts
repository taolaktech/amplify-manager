import { Module } from '@nestjs/common';
import { InternalMediaPresetsController } from './internal-media-presets.controller';
import { UploadService } from 'src/common/file-upload';
import { MediaPresetsModule } from 'src/media-presets/media-presets.module';

@Module({
  imports: [MediaPresetsModule],
  controllers: [InternalMediaPresetsController],
  providers: [UploadService],
})
export class InternalMediaPresetsModule {}
