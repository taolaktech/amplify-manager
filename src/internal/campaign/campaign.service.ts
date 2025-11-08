import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';
import {
  CampaignDocument,
  CampaignProductDoc,
  GoogleAdsCampaignDoc,
} from 'src/database/schema';
import { N8nWebhookPayloadDto, SaveGoogleAdsCampaignDataDto } from './dto';
import {
  CampaignPlatform,
  CampaignStatus,
  GoogleAdsProcessingStatus,
} from 'src/enums/campaign';
import { CampaignService } from 'src/campaign/campaign.service';
import { UtilsService } from 'src/utils/utils.service';
import { AppConfigService } from 'src/config/config.service';
import axios from 'axios';
import { GoogleCampaignBatchMetricsResponse } from './types/google-campaign-batch-metrics';
import pLimit from 'p-limit';

@Injectable()
export class InternalCampaignService {
  private logger = new Logger(InternalCampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    @InjectModel('campaign-products')
    private campaignProductModel: Model<CampaignProductDoc>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
    private config: AppConfigService,
    private campaignService: CampaignService,
    private utilService: UtilsService,
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

    if (dto.adGroups && dto.adGroups.length > 0) {
      const ops = dto.adGroups.map((adG) => ({
        updateOne: {
          filter: {
            campaignId: campaign._id,
            productId: adG.productId,
          },
          update: {
            $set: {
              googleAdGroupResourceName: adG.resourceName,
            },
          },
          upsert: true,
        },
      }));

      await this.campaignProductModel.bulkWrite(ops);
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
      launchedOnAllPlatforms &&= false; // TODO
    }

    if (campaign.platforms.includes(CampaignPlatform.INSTAGRAM)) {
      launchedOnAllPlatforms &&= false; // TODO
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

  private async getGoogleCampaignBatchMetrics(body: {
    customerId: string;
    campaignIds: string[];
  }) {
    try {
      const url = `${this.config.get('INTEGRATION_API_URL')}/api/google-ads/campaigns/get-metrics/batch`;

      const res = await axios.post<GoogleCampaignBatchMetricsResponse[]>(
        url,
        body,
        {
          headers: { 'x-api-key': this.config.get('INTEGRATION_API_KEY') },
        },
      );

      return res.data;
    } catch (error) {
      this.logger.error(
        `::: Unable to fetch google campaign metrics:::`,
        error,
      );
      throw new InternalServerErrorException(
        'Unable to fetch google campaign metrics',
      );
    }
  }

  refreshAllOngoingCampaignMetrics() {
    this.refreshAllOngoingGoogleCampaignMetrics().catch((error) => {
      this.logger.error(
        `Error refreshing ongoing Google campaign metrics: ${error.message}`,
      );
    });
    this.addUpCampaignMetrics().catch((error) => {
      this.logger.error(`Error adding up campaign metrics: ${error.message}`);
    });
  }

  private async refreshAllOngoingGoogleCampaignMetrics() {
    this.logger.log('Starting refresh of all campaign metrics...');

    const now = new Date();
    const queryObject: FilterQuery<CampaignDocument> = {
      status: CampaignStatus.LIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
      platforms: { $in: [CampaignPlatform.GOOGLE] },
    };

    const totalCount = await this.campaignModel.countDocuments(queryObject);
    this.logger.log(
      `Found ${totalCount} ongoing campaigns. ${totalCount > 0 ? 'Refreshing metrics...' : ''}`,
    );
    if (totalCount === 0) return;

    let page = 0;
    const limit = 100;

    while (true) {
      page += 1;
      const skip = (page - 1) * limit;
      const pipeline: PipelineStage[] = [
        {
          $lookup: {
            from: 'campaigns',
            localField: 'campaign',
            foreignField: '_id',
            as: 'campaign',
          },
        },
        {
          $unwind: {
            path: '$campaign',
            includeArrayIndex: '0',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            'campaign.startDate': {
              $lte: now,
            },
            'campaign.endDate': {
              $gte: now,
            },
            processingStatus: 'LAUNCHED',
          },
        },

        {
          $sort: {
            metricsLastUpdatedAt: 1,
            _id: 1,
          },
        },
        {
          $project: {
            campaignResourceName: 1,
            _id: 1,
          },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ];

      const result = await this.googleAdsCampaignModel.aggregate(pipeline);

      const googleCampaigns: { campaignResourceName: string; _id: string }[] =
        result || [];

      if (googleCampaigns.length === 0) {
        break;
      }

      const googleCustomerMap = new Map<
        string,
        { _id: string; googleCampaignId: string }[]
      >();

      const googleCampaignIdToAmplifyId = new Map<string, string>();
      for (const g of googleCampaigns) {
        const props = this.utilService.extractIdsFromGoogleResourceName(
          g.campaignResourceName,
        );
        if (!props) continue;
        googleCampaignIdToAmplifyId.set(props.resourceId, g._id);
        const group = googleCustomerMap.get(props.customerId) ?? [];
        group.push({ _id: g._id, googleCampaignId: props.resourceId });
        googleCustomerMap.set(props.customerId, group);
      }

      const concurrencyLimit = pLimit(5); // Limit to 5 concurrent requests
      const customerOps = Array.from(googleCustomerMap.entries()).map(
        ([customerId, group]) =>
          concurrencyLimit(async () => {
            const metricsResponse = await this.getGoogleCampaignBatchMetrics({
              customerId,
              campaignIds: group.map((g) => g.googleCampaignId),
            });

            const results = metricsResponse[0].results;

            const bulkOps = results.map((r) => ({
              updateOne: {
                filter: {
                  _id: googleCampaignIdToAmplifyId.get(r.campaign.id),
                },
                update: {
                  $set: {
                    metrics: r.metrics,
                    metricsLastUpdatedAt: new Date(),
                  },
                },
              },
            }));

            if (bulkOps.length) {
              await this.googleAdsCampaignModel.bulkWrite(bulkOps, {
                ordered: false,
              });
            }
          }),
      );

      await Promise.allSettled(customerOps);
    }
  }

  private async addUpCampaignMetrics() {
    this.logger.log('Starting refresh of all campaign metrics...');
    const now = new Date();

    const query: FilterQuery<CampaignDocument> = {
      status: CampaignStatus.LIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
    };

    const limit = pLimit(5); // controls concurrent saves
    const batchSize = 100; // number of campaigns processed per round

    const cursor = this.campaignModel
      .find(query)
      .populate('googleAdsCampaign')
      // .populate('facebookCampaign')
      // .populate('instagramCampaign')
      .cursor();

    let batch: CampaignDocument[] = [];

    for await (const campaignDoc of cursor) {
      batch.push(campaignDoc);

      if (batch.length >= batchSize) {
        await this.processCampaignMetricsBatch(batch, limit);
        batch = []; // clear for next round
      }
    }

    // handle last batch
    if (batch.length > 0) {
      await this.processCampaignMetricsBatch(batch, limit);
    }

    this.logger.log('✅ Completed refresh of all campaign metrics.');
  }

  private async processCampaignMetricsBatch(
    batch: CampaignDocument[],
    limit: ReturnType<typeof pLimit>,
  ) {
    await Promise.all(
      batch.map((campaignDoc) =>
        limit(async () => {
          const metrics: CampaignDocument['metrics'] = {
            totalClicks: 0,
            totalConversionsValue: 0,
            totalConversions: 0,
            totalCost: 0,
            totalImpressions: 0,
          };

          const googleMetrics = campaignDoc.googleAdsCampaign?.metrics;
          // const facebookMetrics = campaignDoc.facebookCampaign?.metrics; TODO- populate from the function calling it
          // const instagramMetrics = campaignDoc.instagramCampaign?.metrics; TODO

          if (googleMetrics) {
            metrics.totalClicks += Number(googleMetrics.clicks) || 0;
            metrics.totalConversionsValue +=
              googleMetrics.conversionsValue || 0;
            metrics.totalConversions += googleMetrics.conversions || 0;
            metrics.totalCost +=
              (Number(googleMetrics.costMicros) || 0) / 1_000_000;
            metrics.totalImpressions += Number(googleMetrics.impressions) || 0;
          }

          // TODO Add facebook + instagram logic here later

          await this.campaignModel.findByIdAndUpdate(campaignDoc._id, {
            metrics,
            metricsLastUpdatedAt: new Date(),
          });
        }),
      ),
    );

    this.logger.log(`Processed batch of ${batch.length}`);
  }
}
