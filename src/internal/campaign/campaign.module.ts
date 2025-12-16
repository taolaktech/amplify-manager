import { Module } from '@nestjs/common';
import { InternalCampaignService } from './campaign.service';
import { InternalCampaignController } from './campaign.controller';
import { CampaignService } from 'src/campaign/campaign.service';
import { SqsProducerService } from 'src/campaign/sqs-producer.service';
import { AmplifyWalletService } from 'src/campaign/services/wallet.service';

@Module({
  providers: [
    InternalCampaignService,
    CampaignService,
    SqsProducerService,
    AmplifyWalletService,
    // CampaignWorkerService,
    // FacebookConsumerService,
    // JwtService,
  ],
  controllers: [InternalCampaignController],
})
export class InternalCampaignModule {}
