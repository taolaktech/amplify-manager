import { Module } from '@nestjs/common';
import { InternalBusinessModule } from './business/business.module';
import { InternalCampaignModule } from './campaign/campaign.module';
import { InternalMediaPresetsModule } from './media-presets/internal-media-presets.module';

@Module({
  imports: [
    InternalBusinessModule,
    InternalCampaignModule,
    InternalMediaPresetsModule,
  ],
  providers: [],
})
export class InternalModule {}
