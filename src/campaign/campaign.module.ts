import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { SqsProducerService } from './sqs-producer.service';
import { CampaignWorkerService } from './campaign-worker.service';
import { FacebookConsumerService } from './facebook-consumer.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [
    CampaignService,
    SqsProducerService,
    CampaignWorkerService,
    // FacebookConsumerService,
    JwtService,
  ],
  controllers: [CampaignController],
})
export class CampaignModule {}
