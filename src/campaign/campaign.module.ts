import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { SqsProducerService } from './sqs-producer.service';
import { CampaignWorkerService } from './campaign-worker.service';
// import { FacebookConsumerService } from './facebook-consumer.service';
import { JwtService } from '@nestjs/jwt';
import { AmplifyWalletService } from './services/wallet.service';
import { InternalHttpHelper } from '../common/helpers/internal-http.helper';
import { ServiceRegistryService } from '../common/services/service-registry.service';
import { ShopifyService } from 'src/shopify/shopify.service';

@Module({
  providers: [
    CampaignService,
    SqsProducerService,
    CampaignWorkerService,
    // FacebookConsumerService,
    JwtService,
    AmplifyWalletService,
    InternalHttpHelper,
    ServiceRegistryService,
    ShopifyService,
  ],
  controllers: [CampaignController],
})
export class CampaignModule {}
