import { Module } from '@nestjs/common';
import { InternalBusinessModule } from './business/business.module';
import { InternalCampaignModule } from './campaign/campaign.module';

@Module({
  imports: [InternalBusinessModule, InternalCampaignModule],
  providers: [],
})
export class InternalModule {}
