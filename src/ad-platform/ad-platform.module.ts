import { Module } from '@nestjs/common';
import { GoogleAdsService } from './services/google-ads-platform.service';

@Module({
  providers: [GoogleAdsService],
})
export class AdPlatformModule {}
