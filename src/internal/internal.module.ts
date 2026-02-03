import { Module } from '@nestjs/common';
import { InternalBusinessModule } from './business/business.module';
import { InternalCampaignModule } from './campaign/campaign.module';
import { InternalVideoPresetsModule } from './video-presets/internal-video-presets.module';

@Module({
  imports: [
    InternalBusinessModule,
    InternalCampaignModule,
    InternalVideoPresetsModule,
  ],
  providers: [],
})
export class InternalModule {}
