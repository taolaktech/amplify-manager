import { Module } from '@nestjs/common';
import { MediaPresetsController } from './media-presets.controller';
import { MediaPresetsService } from './media-presets.service';

@Module({
  controllers: [MediaPresetsController],
  providers: [MediaPresetsService],
  exports: [MediaPresetsService],
})
export class MediaPresetsModule {}
