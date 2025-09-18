import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignDocument, GoogleAdsCampaignDoc } from 'src/database/schema';
import { SaveGoogleAdsCampaignDataDto } from './dto';
import { CampaignPlatform, CampaignStatus } from 'src/enums/campaign';

@Injectable()
export class InternalCampaignService {
  private logger = new Logger(InternalCampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
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

    if (dto.allStepsCompleted) {
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
      launchedOnAllPlatforms &&= googleAdsCampaignInfo?.allStepsCompleted;
    }

    if (campaign.platforms.includes(CampaignPlatform.FACEBOOK)) {
      launchedOnAllPlatforms &&= false;
    }

    if (campaign.platforms.includes(CampaignPlatform.INSTAGRAM)) {
      launchedOnAllPlatforms &&= false;
    }

    campaign.status =
      launchedOnAllPlatforms === true
        ? CampaignStatus.LIVE
        : CampaignStatus.FAILED_TO_LAUNCH;

    await campaign.save();
  }
}
