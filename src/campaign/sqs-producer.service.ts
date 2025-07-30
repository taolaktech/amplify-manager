// src/campaigns/sqs-producer.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { CampaignDocument } from '../database/schema';

@Injectable()
export class SqsProducerService implements OnModuleInit {
  private readonly logger = new Logger(SqsProducerService.name);
  private sqsClient: SQSClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing AWS configuration. Make sure AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are set in your environment variables.',
      );
    }

    this.sqsClient = new SQSClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  async sendMessage(campaign: CampaignDocument, platform: string) {
    const queueUrl = this.getQueueUrlForPlatform(platform.toLowerCase());
    if (!queueUrl) {
      this.logger.error(`No SQS queue URL found for platform: ${platform}`);
      return;
    }

    const messageBody = {
      campaignId: campaign._id.toString(),
      // name: campaign.name,
      // targetAudience: campaign.targetAudience,
      // Add any other relevant fields for the consumer
    };

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(messageBody),
    });

    try {
      const result = await this.sqsClient.send(command);
      this.logger.log(
        `::: Message sent to ${platform} queue. Message ID: ${result.MessageId} :::`,
      );
    } catch (error) {
      this.logger.error(
        `::: Error sending message to ${platform} queue:`,
        error,
      );
    }
  }

  private getQueueUrlForPlatform(platform: string): string {
    const env = process.env.NODE_ENV || 'development'; // 'production' or 'development'
    const suffix = env === 'production' ? '' : 'dev-';

    const queueName = `${suffix}${platform.toLowerCase()}-campaign-queue`;

    // construct the full URL based on region and account ID from config
    const region = this.configService.get('AWS_REGION');
    const accountId = this.configService.get('AWS_ACCOUNT_ID');

    return `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
  }
}
