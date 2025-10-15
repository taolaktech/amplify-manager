import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import {
  BusinessDoc,
  CampaignDocument,
  CampaignTopUpRequestDoc,
  GoogleAdsCampaignDoc,
} from 'src/database/schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SqsProducerService } from './sqs-producer.service';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { AmplifyWalletService } from './services/wallet.service';
import { CampaignToUpDto } from './dto/campaign-top-up.dto';
import {
  CampaignPlatform,
  CampaignStatus,
  GoogleAdsProcessingStatus,
} from 'src/enums/campaign';
import { AppConfigService } from 'src/config/config.service';
import axios, { AxiosError } from 'axios';
import { UtilsService } from 'src/utils/utils.service';
import { GetGoogleCampaignMetrics } from './types/google-campaign-metrics-resp';
import {
  GenerateGoogleCreativesDto,
  GenerateMediaCreativesDto,
} from './dto/generate-creatives.dto';

type CampaignValidationCode =
  | 'ready_to_launch'
  | 'validation_failed'
  | 'pending_payment'
  | 'awaiting_ad_account'
  | 'insufficient_plan'
  | 'launching'
  | 'live'
  | 'paused'
  | 'failed_to_launch'
  | 'error';

type GoogleCreativeGenBody = {
  productName: string;
  productPrice: string;
  productDescription: string;
  productOccasion: string;
  productFeatures: string[];
  tone: string;
  productCategory: string;
  brandName: string;
  channel: 'GOOGLE';
  productImage: string;
  productLink: string;
  campaignType: string;
};

type FbIgCreativeGenBody = {
  businessId: string;
  productName: string;
  productFeatures: string[];
  brandName: string;
  channel: string;
  approach: 'AI';
  productImages: string[];
  campaignType: string;
  type: string;
  productDescription?: string;
  productCategory?: string;
  brandColor?: string;
  brandAccent?: string;
  tone?: string;
  siteUrl?: string;
  campaignId?: string;
};

@Injectable()
export class CampaignService {
  private logger = new Logger(CampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
    @InjectModel('business') private businessModel: Model<BusinessDoc>,
    @InjectModel('campaign-top-up-requests')
    private topUpRequestModel: Model<CampaignTopUpRequestDoc>,
    private readonly sqsProducer: SqsProducerService,
    private readonly walletService: AmplifyWalletService,
    private readonly config: AppConfigService,
    private readonly utilsService: UtilsService,
  ) {}

  private async campaignValidation(params: {
    createCampaignDto: CreateCampaignDto;
    userId: string;
  }) {
    const { createCampaignDto, userId } = params;
    const validation: { message: string; code: CampaignValidationCode } = {
      code: 'ready_to_launch',
      message: 'Ready to Launch',
    };

    const business = await this.businessModel.findById(
      createCampaignDto.businessId,
    );

    if (!business || business.userId.toString() !== userId.toString()) {
      validation.code = 'validation_failed';
      validation.message = 'Invalid business provided!!';

      return { validation };
    }

    // get user planTier and campaign limit and make sure
    // user doesnt or hasnt exceeded  their limit
    const userPlanAndLimit =
      await this.walletService.getSubscriptionDetails(userId);
    this.logger.log(
      `::: User ${userId} has ${JSON.stringify(userPlanAndLimit)} Subscription :::`,
    );

    // count the number of campaigns the user has created
    const campaignCount = await this.campaignModel.countDocuments({
      createdBy: userId,
    });

    this.logger.log(
      `::: User ${userId} has created ${campaignCount} Campaigns :::`,
    );

    // check if user has exceeded their campaign limit
    if (campaignCount >= userPlanAndLimit.campaignLimit) {
      this.logger.debug(
        `::: User ${userId} has reached their campaign limit :::`,
      );
      validation.code = 'insufficient_plan';
      validation.message = 'Plan limits exceeded';
      return { validation };
    }

    return { validation, business };
  }

  private async getCreativesWithAmplifyAi(data: GoogleCreativeGenBody) {
    try {
      const url = `${this.config.get('AMPLIFY_AI_API_URL')}/api/creatives`;
      const response = await axios.post<{
        success: boolean;
        data: { headline: string; description: string }[];
      }>(url, data);
      return response.data;
    } catch (error: any) {
      if (error instanceof AxiosError) {
        this.logger.error(
          `Error generating creatives- ${JSON.stringify(error.response?.data || error.response)}`,
        );
      } else {
        this.logger.error(
          `::: Unable to generate creatives- ${error.messsage}} error} :::`,
        );
      }
      throw new InternalServerErrorException(
        'Something went wrong while lauching campaign',
      );
    }
  }

  private async generateCreativesForAllProducts(params: {
    campaignDoc: CampaignDocument;
    business: BusinessDoc;
  }) {
    const { campaignDoc, business } = params;
    let failedToGenerateSomeCreatives = false;

    const googleSelected = campaignDoc.platforms.includes(
      CampaignPlatform.GOOGLE,
    );
    const facebookSelected = campaignDoc.platforms.includes(
      CampaignPlatform.FACEBOOK,
    );
    const instagramSelected = campaignDoc.platforms.includes(
      CampaignPlatform.INSTAGRAM,
    );

    const checkChannelsIfCreativeGenNeeded = (
      creatives: CampaignDocument['products'][0]['creatives'],
    ) => {
      let googleCreativesPresent = false;
      let instagramCreativesPresent = false;
      let facebookCreativesPresent = false;

      creatives.forEach((creative) => {
        if (creative.channel === 'instagram' && creative.id) {
          instagramCreativesPresent = true;
        }
        if (creative.channel === 'facebook' && creative.id) {
          facebookCreativesPresent = true;
        }
        if (creative.channel === 'google' && creative.data.length > 0) {
          googleCreativesPresent = true;
        }
      });
      return {
        googleCreativesPresent,
        instagramCreativesPresent,
        facebookCreativesPresent,
      };
    };

    /* begin loop */
    for (let i = 0; i < campaignDoc.products.length; i++) {
      const product = campaignDoc.products[i];
      if (!product.creatives) {
        campaignDoc.products[i].creatives = [];
      }
      const {
        googleCreativesPresent,
        instagramCreativesPresent,
        facebookCreativesPresent,
      } = checkChannelsIfCreativeGenNeeded(product.creatives);

      const productNeedsCreatives =
        (googleSelected && !googleCreativesPresent) ||
        (facebookSelected && !facebookCreativesPresent) ||
        (instagramSelected && !instagramCreativesPresent);

      if (!productNeedsCreatives) {
        continue;
      }

      this.logger.log(
        `::: Now generating creatives for campaign ${campaignDoc._id.toString()}, product-${i}`,
      );

      const googlePayload: GoogleCreativeGenBody = {
        productName: product.title,
        productPrice: `$${product.price.toString()}`,
        productDescription: product.description,
        productOccasion: product.occasion ?? '',
        productFeatures: product.features,
        tone: campaignDoc.tone,
        productCategory: product.category,
        brandName: product.title,
        channel: 'GOOGLE',
        productImage: product.imageLinks[0],
        productLink: product.productLink,
        campaignType: campaignDoc.type,
      };

      const fbIgPayload: FbIgCreativeGenBody = {
        approach: 'AI', // req
        campaignId: campaignDoc._id.toString(),
        businessId: business._id.toString(),
        campaignType: googlePayload.campaignType,
        productName: googlePayload.productName,
        productFeatures: googlePayload.productFeatures,
        brandName: googlePayload.brandName,
        channel: 'INSTAGRAM',
        productImages: product.imageLinks,
        type: 'IMAGE',
        productCategory: googlePayload.productCategory, //opt
        tone: googlePayload.tone, // opt
        brandColor: campaignDoc.brandColor, // opt
        brandAccent: campaignDoc.accentColor, // opt
        siteUrl: business.website, // opt
        productDescription: googlePayload.productDescription, // optional
      };

      const promises: Promise<any>[] = [];
      if (googleSelected && !googleCreativesPresent) {
        // generate google creatives
        const googleCreativePromise = this.getCreativesWithAmplifyAi({
          ...googlePayload,
          channel: 'GOOGLE',
        })
          .then((resp) => {
            const creative = {
              data: resp.data.map((d) => JSON.stringify(d)),
              channel: 'google' as const,
            };
            campaignDoc.products[i].creatives.push(creative);
          })
          .catch((error) => {
            let errorMessage = 'Something went wrong';
            if (error instanceof AxiosError) {
              errorMessage = error.response?.data
                ? JSON.stringify({ error: error.response?.data })
                : 'Undetermined Error';
            }
            this.logger.debug(
              `Unable to generate creative, campaignId- ${campaignDoc._id.toString()}, product- ${i} channel- GOOGLE, error- ${errorMessage}`,
            );
            throw error;
          });
        promises.push(googleCreativePromise);
      }

      if (facebookSelected && !facebookCreativesPresent) {
        // generate facebook creatives
        const facebookCreativesPromise = this.n8nCall({
          ...fbIgPayload,
          channel: 'FACEBOOK',
        })
          .then((resp) => {
            if (resp.status === '400' || resp.status === '401') {
              throw new Error(
                `Failed to get creative set id. Failed with status ${resp.status}, channel facebook`,
              );
            }
            if (!resp.creativeSetId) {
              throw new Error(
                `Failed to get creative set id. creativeSetId not present, channel facebook`,
              );
            }
            const creative = {
              channel: 'facebook' as const,
              id: resp.creativeSetId,
              status: 'pending' as const,
              data: [],
            };
            campaignDoc.products[i].creatives.push(creative);
          })
          .catch((error) => {
            let errorMessage = 'Something went wrong';
            if (error instanceof AxiosError) {
              errorMessage = error.response?.data
                ? JSON.stringify({ error: error.response?.data })
                : 'Undetermined Error';
            }
            if (error instanceof Error) {
              errorMessage = error.message;
            }
            this.logger.debug(
              `Unable to generate creative, campaignId- ${campaignDoc._id.toString()}, product- ${i}, channel- FACEBOOK, error- ${errorMessage}`,
            );
            throw error;
          });
        promises.push(facebookCreativesPromise);
      }
      if (instagramSelected && !instagramCreativesPresent) {
        // generate instagram creatives
        const instagramCreatives = this.n8nCall({
          ...fbIgPayload,
          channel: 'INSTAGRAM',
        })
          .then((resp) => {
            if (resp.status === '400' || resp.status === '401') {
              throw new Error(
                `Failed to get creative set id. Failed with status ${resp.status}, channel facebook`,
              );
            }
            if (!resp.creativeSetId) {
              throw new Error(
                `Failed to get creative set id. creativeSetId not present, channel facebook`,
              );
            }
            const creative = {
              channel: 'instagram' as const,
              id: resp.creativeSetId,
              status: 'pending' as const,
              data: [],
            };
            campaignDoc.products[i].creatives.push(creative);
          })
          .catch((error) => {
            let errorMessage = 'Something went wrong';
            if (error instanceof AxiosError) {
              errorMessage = error.response?.data
                ? JSON.stringify({ error: error.response?.data })
                : 'Undetermined Error';
            }
            if (error instanceof Error) {
              errorMessage = error.message;
            }
            this.logger.debug(
              `::: Unable to generate creative, campaignId- ${campaignDoc._id.toString()}, product- ${i}, channel- INSTAGRAM, error- ${errorMessage}:::`,
            );
            throw error;
          });
        promises.push(instagramCreatives);
      }

      const results = await Promise.allSettled(promises);
      await campaignDoc.save(); // save for the promises that fulfilled

      const rejected = results.filter((r) => r.status === 'rejected');

      if (rejected.length) {
        this.logger.debug(
          `::: Reasons- ${rejected.map((r) => JSON.stringify({ d: r.reason })).join(', ')} :::`,
        );
      }

      failedToGenerateSomeCreatives ||= !!rejected.length;
    }
    /* End of loop */

    if (failedToGenerateSomeCreatives) {
      this.logger.error(
        `::: Failed to generate creatives for campaign one or more products- ${campaignDoc._id.toString()} :::`,
      );
    }
  }

  private async getGoogleCampaignMetrics(campaignResourceName: string) {
    try {
      const resourceComponents =
        this.utilsService.extractIdsFromGoogleResourceName(
          campaignResourceName,
        );

      if (!resourceComponents) {
        throw new BadRequestException('Invalid Google Campaign Resource Name');
      }

      const { customerId, resourceId: campaignId } = resourceComponents;

      const url = `${this.config.get('INTEGRATION_API_URL')}/api/google-ads/campaigns/get-metrics`;

      const res = await axios.post<GetGoogleCampaignMetrics>(
        url,
        {
          customerId,
          campaignId,
        },
        {
          headers: { 'x-api-key': this.config.get('INTEGRATION_API_KEY') },
        },
      );

      return res.data;
    } catch (error) {
      this.logger.error(
        `::: Unable to fetch google campaign metrics, campaignResourceName- ${campaignResourceName}- ${error.message} :::`,
      );
      throw new InternalServerErrorException(
        'Unable to fetch google campaign metrics',
      );
    }
  }
  /**
    @description- this function checks if all creatives are present for all platforms and creatives are present for each platform. If platform not included in campaign, all{{platform}}Creatives returns Undefined. just check the return statement
  */
  checkIfAllCreativesPresent(campaignDoc: CampaignDocument) {
    const googleSelected = campaignDoc.platforms.includes(
      CampaignPlatform.GOOGLE,
    );
    const facebookSelected = campaignDoc.platforms.includes(
      CampaignPlatform.FACEBOOK,
    );
    const instagramSelected = campaignDoc.platforms.includes(
      CampaignPlatform.INSTAGRAM,
    );

    const checkChannelCreatives = (
      creatives: CampaignDocument['products'][0]['creatives'],
    ) => {
      let googleCreativesPresent = false;
      let instagramCreativesPresent = false;
      let facebookCreativesPresent = false;

      creatives.forEach((creative) => {
        //TODO parse creative.data ??? check if has url to be true
        if (creative.channel === 'instagram' && creative.data.length > 0) {
          instagramCreativesPresent = true;
        }
        if (creative.channel === 'facebook' && creative.data.length > 0) {
          facebookCreativesPresent = true;
        }

        if (creative.channel === 'google') {
          googleCreativesPresent = true;
        }
      });
      return {
        googleCreativesPresent,
        instagramCreativesPresent,
        facebookCreativesPresent,
      };
    };

    let [
      allCreativesPresent,
      allGoogleCreativesPresent,
      allFacebookCreativesPresent,
      allInstagramCreativesPresent,
    ] = [true, true, true, true];

    /* begin loop */
    for (let i = 0; i < campaignDoc.products.length; i++) {
      const product = campaignDoc.products[i];
      if (!product.creatives) {
        campaignDoc.products[i].creatives = [];
      }
      const {
        googleCreativesPresent,
        instagramCreativesPresent,
        facebookCreativesPresent,
      } = checkChannelCreatives(product.creatives);

      const googleCreativesNeeded = googleSelected && !googleCreativesPresent;
      const facebookCreativesNeeded =
        facebookSelected && !facebookCreativesPresent;
      const instagramCreativesNeeded =
        instagramSelected && !instagramCreativesPresent;

      const productNeedsCreatives =
        googleCreativesNeeded ||
        facebookCreativesNeeded ||
        instagramCreativesNeeded;

      allCreativesPresent &&= !productNeedsCreatives;
      allGoogleCreativesPresent &&= !googleCreativesNeeded;
      allFacebookCreativesPresent &&= !facebookCreativesNeeded;
      allInstagramCreativesPresent &&= !instagramCreativesNeeded;
    }

    return {
      allCreativesPresent,
      allGoogleCreativesPresent: !googleSelected
        ? undefined
        : allGoogleCreativesPresent,
      allFacebookCreativesPresent: !facebookSelected
        ? undefined
        : allFacebookCreativesPresent,
      allInstagramCreativesPresent: !instagramSelected
        ? undefined
        : allInstagramCreativesPresent,
    };
  }

  async publishCampaignToAllRespectiveQueues(campaignDoc: CampaignDocument) {
    const messagePromises = campaignDoc.platforms.map((platform) => {
      this.logger.log(`Initiating message send for platform: ${platform}`);
      return this.publishCampaignToPlatformQueue(campaignDoc, platform);
    });

    //
    try {
      await Promise.all(messagePromises);
      this.logger.log(
        `All messages for campaign ${campaignDoc._id.toString()} were successfully accepted by SQS.`,
      );
    } catch (error) {
      this.logger.error(
        `One or more messages failed to send for campaign ${campaignDoc._id.toString()}.`,
        error,
      );

      campaignDoc.status = CampaignStatus.FAILED_TO_LAUNCH;
      await campaignDoc.save();

      throw error;
    }
  }

  async publishCampaignToPlatformQueue(
    campaignDoc: CampaignDocument,
    platform: CampaignDocument['platforms'][0],
  ) {
    if (!campaignDoc.platforms.includes(platform)) {
      return;
    }
    try {
      if (platform === CampaignPlatform.GOOGLE) {
        const googleCampaign = await this.googleAdsCampaignModel.findOne({
          campaign: campaignDoc._id,
        });

        if (
          googleCampaign &&
          googleCampaign.processingStatus === GoogleAdsProcessingStatus.LAUNCHED
        ) {
          return;
        }
      }

      /* TODO- Add conditions for facebook and instagram- ignore if retry safe */
      await this.sqsProducer.sendMessage(campaignDoc, platform);
      this.logger.log(
        `${platform} message for campaign ${campaignDoc._id.toString()} was successfully accepted by SQS.`,
      );
    } catch (error) {
      this.logger.error(
        `${platform} message failed to send to sqs for campaign ${campaignDoc._id.toString()}`,
        error,
      );

      campaignDoc.status = CampaignStatus.FAILED_TO_LAUNCH;
      await campaignDoc.save();

      throw error;
    }
  }

  async create(
    createCampaignDto: CreateCampaignDto,
    userId: Types.ObjectId,
  ): Promise<CampaignDocument> {
    try {
      const { validation, business } = await this.campaignValidation({
        createCampaignDto,
        userId: userId.toString(),
      });

      if (validation.code !== 'ready_to_launch') {
        throw new ForbiddenException(validation);
      }

      if (!business) {
        throw new ForbiddenException({ message: 'business not provided' });
      }

      const campaignId = new Types.ObjectId();
      // debit the user wallet for campaign creation
      await this.walletService.debitForCampaign({
        userId: userId.toString(),
        idempotencyKey: campaignId.toString(),
        amountInCents: createCampaignDto.totalBudget * 100,
      });
      this.logger.log(
        `::: User ${userId.toString()} wallet has been debited ($${createCampaignDto.totalBudget}) for campaign ${campaignId.toString()}`,
      );

      // 1. Save the campaign to the database
      const newCampaign = await this.campaignModel.create({
        ...createCampaignDto,
        status: CampaignStatus.READY_TO_LAUNCH,
        createdBy: userId,
        shopifyAccountId: business.integrations?.shopify?.shopifyAccount,
        _id: campaignId,
      });

      // generate creatives or creatives set ids of products without any
      await this.generateCreativesForAllProducts({
        campaignDoc: newCampaign,
        business,
      });

      const { allCreativesPresent, allGoogleCreativesPresent } =
        this.checkIfAllCreativesPresent(newCampaign);

      if (allGoogleCreativesPresent === false) {
        this.logger.debug(
          `::: Unable to generate google creatives for ${newCampaign._id.toString()}`,
        );
      }

      if (allCreativesPresent) {
        newCampaign.status = CampaignStatus.PROCESSED;
        await this.publishCampaignToAllRespectiveQueues(newCampaign);
      }
      await newCampaign.save();

      return newCampaign;
    } catch (error) {
      this.logger.error(`Error creating campaign: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(
        `Error creating campaign: ${error.message}`,
      );
    }
  }

  async findOne(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignModel.findById(id);

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(
    id: string,
    userId: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignDocument> {
    try {
      // 1. Check for an empty request body
      if (Object.keys(updateCampaignDto).length === 0) {
        throw new BadRequestException('Update data cannot be empty.');
      }

      // 2. Find and update the document atomically.
      // The { new: true } option ensures the updated document is returned.
      const updatedCampaign = await this.campaignModel
        .findByIdAndUpdate(id, updateCampaignDto, { new: true })
        .exec();

      // 3. Handle the case where the campaign does not exist
      if (!updatedCampaign) {
        throw new NotFoundException(`Campaign with ID "${id}" not found`);
      }

      this.logger.log(`Campaign with ID "${id}" was successfully updated.`);
      return updatedCampaign;
    } catch (error) {
      let errorMessage = error.message;
      this.logger.error(
        `Error updating campaign with ID ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        // extract the error message from the HttpException instance
        errorMessage = error.message;
      }

      throw new InternalServerErrorException(
        `Error updating campaign with ID ${id}: ${errorMessage}`,
      );
    }
  }

  private async calculateMetricsForCampaign(campaignDoc: CampaignDocument) {
    // populate data from necessary collections
    const campaignMetrics: CampaignDocument['metrics'] = {
      totalClicks: 0,
      totalConversionsValue: 0,
      totalConversions: 0,
      totalCost: 0,
      totalImpressions: 0,
    };
    const staleTimeInMs = 2 * 60 * 60 * 1000; // 2 hours
    await campaignDoc.populate('googleAdsCampaign');
    const metricsLastUpdatedAt =
      campaignDoc.googleAdsCampaign?.metricsLastUpdatedAt;

    let googleCampaignMetrics = campaignDoc.googleAdsCampaign?.metrics;
    // let facebookCampaignMetrics = campaignDoc.facebookCampaign?.metrics;
    // let instagramCampaignMetrics = campaignDoc.instagramCampaign?.metrics;
    const now = new Date();
    // metrics stale when campaign has never been updated or last update was more than 2 hours ago
    const isGoogleMetricsStale =
      !metricsLastUpdatedAt ||
      now.getTime() - metricsLastUpdatedAt.getTime() > staleTimeInMs;

    // update google metrics if google campaign exists and metrics are stale
    if (
      campaignDoc.googleAdsCampaign?.campaignResourceName &&
      isGoogleMetricsStale
    ) {
      this.logger.log(
        `google metrics are stale for campaign ${campaignDoc._id.toString()}. Retrieving fresh metrics.`,
      );
      const metricsResult = await this.getGoogleCampaignMetrics(
        campaignDoc.googleAdsCampaign.campaignResourceName,
      );
      googleCampaignMetrics = metricsResult.results[0].metrics;
      if (metricsResult.results.length && googleCampaignMetrics) {
        await this.googleAdsCampaignModel.findOneAndUpdate(
          { campaign: campaignDoc._id },
          {
            $set: {
              metrics: googleCampaignMetrics,
              metricsLastUpdatedAt: new Date(),
            },
          },
          { new: true },
        );
      }
    }

    if (googleCampaignMetrics) {
      campaignMetrics.totalClicks += Number(googleCampaignMetrics.clicks);
      campaignMetrics.totalConversionsValue +=
        googleCampaignMetrics.conversionsValue;
      campaignMetrics.totalConversions += googleCampaignMetrics.conversions;
      campaignMetrics.totalCost +=
        Number(googleCampaignMetrics.costMicros) / 1_000_000;
      campaignMetrics.totalImpressions += Number(
        googleCampaignMetrics.impressions,
      );
    }
    // if (facebookCampaignMetrics) {
    //   campaignMetrics.totalClicks += Number(facebookCampaignMetrics.clicks);
    //   campaignMetrics.totalConversionsValue +=
    //     facebookCampaignMetrics.conversionsValue;
    //   campaignMetrics.totalConversions += facebookCampaignMetrics.conversions;
    //   campaignMetrics.totalCost +=
    //     Number(facebookCampaignMetrics.costMicros) / 1_000_000;
    //   campaignMetrics.totalImpressions += Number(
    //     facebookCampaignMetrics.impressions,
    //   );
    // }

    // if (instagramCampaignMetrics) {
    //   campaignMetrics.totalClicks += Number(facebookCampaignMetrics.clicks);
    //   campaignMetrics.totalConversionsValue +=
    //     facebookCampaignMetrics.conversionsValue;
    //   campaignMetrics.totalConversions += facebookCampaignMetrics.conversions;
    //   campaignMetrics.totalCost +=
    //     Number(facebookCampaignMetrics.costMicros) / 1_000_000;
    //   campaignMetrics.totalImpressions += Number(
    //     facebookCampaignMetrics.impressions,
    //   );
    // }

    campaignDoc.metrics = campaignMetrics;
    await campaignDoc.save();
  }

  async findAll(listCampaignsDto: ListCampaignsDto, userId: string) {
    const { page, perPage, status, type, platforms, sortBy } = listCampaignsDto;

    // 1. Build the filter query, now including the createdBy field
    const filter: FilterQuery<CampaignDocument> = {
      createdBy: new Types.ObjectId(userId),
    };
    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (platforms && platforms.length > 0) {
      filter.platforms = { $all: platforms };
    }

    // 2. Build the sort query - with the TypeScript fix
    const [sortField, sortOrder] = sortBy.split(':');
    const sortOptions: { [key: string]: SortOrder } = {
      [sortField]: sortOrder as SortOrder,
    };

    // 3. Calculate pagination
    const skip = (page - 1) * perPage;

    // 4. Execute queries
    const [campaigns, total] = await Promise.all([
      this.campaignModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(perPage),
      this.campaignModel.countDocuments(filter).exec(),
    ]);

    // retrieve metrics for all google campaigns in the list
    for (let i = 0; i < campaigns.length; i++) {
      await this.calculateMetricsForCampaign(campaigns[i]);
    }

    // 5. Construct the paginated response
    const pagination = this.utilsService.getPaginationMeta({
      total,
      page,
      perPage,
    });
    return {
      campaigns,
      pagination,
    };
  }

  async topUpCampaignBudget(
    userId: string,
    campaignId: string,
    topUpRequestBody: CampaignToUpDto,
  ) {
    // check if campaign exists first
    const campaign = await this.campaignModel.findById(campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // create nw CampaignTopUpRequest with status of PENDING
    const topUpRequestId = new Types.ObjectId();
    try {
      const newCampaignTopRequest = new this.topUpRequestModel({
        _id: topUpRequestId,
        userId,
        campaignId,
        amountInCents: topUpRequestBody.amount * 100,
        status: 'PENDING',
      });

      await newCampaignTopRequest.save();

      try {
        const response = await this.walletService.debitForCampaign({
          userId: userId,
          idempotencyKey: topUpRequestId.toString(),
          amountInCents: topUpRequestBody.amount * 100,
        });

        if (response?.success) {
          await this.campaignModel.findByIdAndUpdate(campaignId, {
            $inc: {
              totalBudget: topUpRequestBody.amount,
            },
          });

          // update topup request record
          await this.topUpRequestModel.findByIdAndUpdate(topUpRequestId, {
            $set: {
              status: 'COMPLETED',
            },
          });
        }
      } catch (error) {
        // throw an error here so we can update the status of the request to
        // FAILED in one place
        this.logger.error(
          `::: Error from wallet service while topping up campaign budget => ${JSON.stringify(error)} :::`,
        );
        throw error;
      }
    } catch (error) {
      // update status of top up request to FAILED
      await this.topUpRequestModel.findByIdAndUpdate(topUpRequestId, {
        $set: {
          status: 'FAILED',
        },
      });

      this.logger.error(
        `::: Error occured while topping up campaign budget ${JSON.stringify(error)} :::`,
      );
      const message = error?.message ?? 'Error handling top-up';

      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException(message);
    }
  }

  private async n8nCall(data: FbIgCreativeGenBody) {
    try {
      const url = `${this.config.get('AMPLIFY_N8N_API_URL')}/webhook/4032ad24-63b4-474c-8609-a3500b06b8bc`;

      const response = await axios.post<{
        creativeSetId: string;
        status: string;
        message?: string;
      }>(url, data, {
        headers: {
          Authorization: `Bearer ${this.config.get('AMPLIFY_N8N_API_KEY')}`,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Error calling n8n- ${JSON.stringify(error.response?.data || error.response)}`,
      );
      throw new InternalServerErrorException(
        'Unable to load creatives at the moment',
      );
    }
  }

  async generateMediaCreatives(
    userId: Types.ObjectId,
    body: GenerateMediaCreativesDto,
  ) {
    const business = await this.businessModel.findOne({ userId });

    if (!business) {
      throw new BadRequestException(`Business not found for this user`);
    }

    return await this.n8nCall({
      ...body,
      approach: 'AI',
      businessId: business?._id.toString(),
    });
  }

  async generateGoogleCreatives(
    userId: Types.ObjectId,
    body: GenerateGoogleCreativesDto,
  ) {
    const business = await this.businessModel.findOne({ userId });

    if (!business) {
      throw new BadRequestException(`Business not found for this user`);
    }

    return await this.getCreativesWithAmplifyAi({ ...body, channel: 'GOOGLE' });
  }
}
