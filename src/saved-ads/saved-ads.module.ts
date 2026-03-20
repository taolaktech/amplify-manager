import { Module } from '@nestjs/common';
import { SavedAdsController } from './saved-ads.controller';
import { SavedAdsService } from './saved-ads.service';
import { UploadService } from 'src/common/file-upload';

@Module({
  controllers: [SavedAdsController],
  providers: [SavedAdsService, UploadService],
})
export class SavedAdsModule {}
