import { Module } from '@nestjs/common';
import { InternalCampaignService } from './campaign.service';
import { InternalCampaignController } from './campaign.controller';
import { CampaignService } from 'src/campaign/campaign.service';
import { SqsProducerService } from 'src/campaign/sqs-producer.service';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { AmplifyWalletService } from 'src/campaign/services/wallet.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';

@Module({
  providers: [
    InternalCampaignService,
    CampaignService,
    SqsProducerService,
    ServiceRegistryService,
    // CampaignWorkerService,
    // FacebookConsumerService,
    // JwtService,
    AmplifyWalletService,
    InternalHttpHelper,
  ],
  controllers: [InternalCampaignController],
})
export class InternalCampaignModule {}
