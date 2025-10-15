import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignDocument, GoogleAdsCampaignDoc } from 'src/database/schema';
import { N8nWebhookPayloadDto, SaveGoogleAdsCampaignDataDto } from './dto';
import {
  CampaignPlatform,
  CampaignStatus,
  GoogleAdsProcessingStatus,
} from 'src/enums/campaign';
import { CampaignService } from 'src/campaign/campaign.service';

@Injectable()
export class InternalCampaignService {
  private logger = new Logger(InternalCampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
    private campaignService: CampaignService,
  ) {}

  async findOne(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignModel.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async saveGoogleAdsCampaignData(
    campaignId: string,
    dto: SaveGoogleAdsCampaignDataDto,
  ) {
    const campaign = await this.campaignModel.findById(campaignId);

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    const googleAdsCampaign =
      await this.googleAdsCampaignModel.findOneAndUpdate(
        { campaign: campaign._id },
        { campaign: campaign._id, ...dto },
        { new: true, upsert: true },
      );

    if (
      googleAdsCampaign.processingStatus === GoogleAdsProcessingStatus.LAUNCHED
    ) {
      await this.updateCampaignLaunchState(campaign);
    }

    return googleAdsCampaign;
  }

  private async updateCampaignLaunchState(campaign: CampaignDocument) {
    let launchedOnAllPlatforms = true;

    if (campaign.platforms.includes(CampaignPlatform.GOOGLE)) {
      const googleAdsCampaignInfo = await this.googleAdsCampaignModel.findOne({
        campaign: campaign._id,
      });

      if (!googleAdsCampaignInfo) {
        return;
      }
      launchedOnAllPlatforms &&=
        googleAdsCampaignInfo.processingStatus ===
        GoogleAdsProcessingStatus.LAUNCHED;
    }

    if (campaign.platforms.includes(CampaignPlatform.FACEBOOK)) {
      launchedOnAllPlatforms &&= false;
    }

    if (campaign.platforms.includes(CampaignPlatform.INSTAGRAM)) {
      launchedOnAllPlatforms &&= false;
    }

    if (launchedOnAllPlatforms) {
      campaign.status = CampaignStatus.LIVE;
      await campaign.save();
    }
  }

  async campaignCreativesWebhook(payload: N8nWebhookPayloadDto) {
    const { campaignId, status, creativeSetId, creatives } = payload;

    if (status !== 'completed') {
      this.logger.warn(
        `status ${status} from n8n, campaignId: ${campaignId}, creativeSetId: ${creativeSetId}`,
      );
      return;
    }
    // find campaign by id
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      this.logger.warn(
        `::: campaign ${campaignId} not found to insert creatives :::`,
      );
      return;
    }
    let productIndex = -1;
    let creativeIndex = -1;
    let channel: undefined | 'facebook' | 'instagram' | 'google';

    for (let i = 0; i < campaign.products.length; i++) {
      for (let j = 0; j < campaign.products[i].creatives.length; j++) {
        if (campaign.products[i].creatives[j].id === creativeSetId) {
          productIndex = i;
          creativeIndex = j;
          channel = campaign.products[i].creatives[j].channel;
          this.logger.log(
            `creatives gotten for campaign- ${campaignId}, product- ${i}, platform- ${channel}`,
          );
          break;
        }
      }
      if (productIndex && creativeIndex) {
        //early return
        break;
      }
    }

    if (productIndex === -1 || creativeIndex === -1 || !channel) {
      this.logger.debug(
        `creativeSetId ${creativeSetId} not found on campaign ${campaign._id.toString()}`,
      );
      return;
    }

    campaign.products[productIndex].creatives[creativeIndex].data = creatives;
    campaign.products[productIndex].creatives[creativeIndex].status = 'created';
    await campaign.save();

    const {
      allCreativesPresent,
      allFacebookCreativesPresent,
      allInstagramCreativesPresent,
    } = this.campaignService.checkIfAllCreativesPresent(campaign);
    if (
      allCreativesPresent &&
      campaign.status === CampaignStatus.READY_TO_LAUNCH
    ) {
      campaign.status = CampaignStatus.PROCESSED;
      await campaign.save();
    }

    if (allFacebookCreativesPresent && channel === 'facebook') {
      await this.campaignService.publishCampaignToPlatformQueue(
        campaign,
        CampaignPlatform.FACEBOOK,
      );
    }

    if (allInstagramCreativesPresent && channel === 'instagram') {
      await this.campaignService.publishCampaignToPlatformQueue(
        campaign,
        CampaignPlatform.INSTAGRAM,
      );
    }
  }
}
