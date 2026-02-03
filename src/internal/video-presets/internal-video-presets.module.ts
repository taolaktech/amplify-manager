import { Module } from '@nestjs/common';
import { InternalVideoPresetsController } from './internal-video-presets.controller';
import { UploadService } from 'src/common/file-upload';
import { VideoPresetsModule } from 'src/video-presets/video-presets.module';

@Module({
  imports: [VideoPresetsModule],
  controllers: [InternalVideoPresetsController],
  providers: [UploadService],
})
export class InternalVideoPresetsModule {}
