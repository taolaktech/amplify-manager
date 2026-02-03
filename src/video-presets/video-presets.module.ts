import { Module } from '@nestjs/common';
import { VideoPresetsController } from './video-presets.controller';
import { VideoPresetsService } from './video-presets.service';

@Module({
  controllers: [VideoPresetsController],
  providers: [VideoPresetsService],
  exports: [VideoPresetsService],
})
export class VideoPresetsModule {}
