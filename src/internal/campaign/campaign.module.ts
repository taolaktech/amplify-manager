import { Module } from '@nestjs/common';
import { InternalCampaignService } from './campaign.service';
import { InternalCampaignController } from './campaign.controller';

@Module({
  providers: [InternalCampaignService],
  controllers: [InternalCampaignController],
})
export class InternalCampaignModule {}
