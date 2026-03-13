import { Module } from '@nestjs/common';
import { SavedAdsController } from './saved-ads.controller';
import { SavedAdsService } from './saved-ads.service';

@Module({
  controllers: [SavedAdsController],
  providers: [SavedAdsService],
})
export class SavedAdsModule {}
