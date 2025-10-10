import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignDocument, GoogleAdsCampaignDoc } from 'src/database/schema';
import { SaveGoogleAdsCampaignDataDto } from './dto';
import {
  CampaignPlatform,
  CampaignStatus,
  GoogleAdsProcessingStatus,
} from 'src/enums/campaign';
import { CampaignService } from 'src/campaign/campaign.service';

type N8nWebhookPayload = {
  creativeSetId: string;
  campaignId: string;
  status: 'completed' | 'failed';
};

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

  async campaignCreativesWebhook(payload: N8nWebhookPayload) {
    const { campaignId, status, creativeSetId } = payload;

    // find campaign by id
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }
    // update the campaign creatives info
    if (status === 'failed') {
      campaign.status = CampaignStatus.FAILED_TO_LAUNCH;
      //TODO-
      await campaign.save();
      const message = `Creative generation failed for campaign ${campaignId}, creativeSetId ${creativeSetId}`;
      this.logger.error(message);
      return { message: 'campaign status now failed' };
    }
    if (status === 'completed') {
      console.log('Find creative set and update campaign', creativeSetId);
    }

    // check if all creatives are present. Where do we get all the creatives info from ?????
    const {
      allCreativesPresent,
      // allGoogleCreativesPresent,
      // allFacebookCreativesPresent,
      // allInstagramCreativesPresent,
    } = this.campaignService.checkIfAllCreativesPresent(campaign);
    // if all creatives present, send campaign to queues and update status to launching
    if (allCreativesPresent) {
      campaign.status = CampaignStatus.PROCESSED;
      await campaign.save();
      await this.campaignService.publishCampaignToAllRespectiveQueues(campaign);
      return { message: 'campaign status now launching' };
    }
  }
}
