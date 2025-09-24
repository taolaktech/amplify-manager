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
} from 'src/database/schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { SqsProducerService } from './sqs-producer.service';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { AmplifyWalletService } from './services/wallet.service';
import { CampaignToUpDto } from './dto/campaign-top-up.dto';
import { CampaignPlatform, CampaignStatus } from 'src/enums/campaign';
import { AppConfigService } from 'src/config/config.service';
import axios, { AxiosError } from 'axios';
import { ShopifyService } from 'src/shopify/shopify.service';

type CampaignValidationStatus =
  | 'ready_to_launch'
  | 'validation_failed'
  | 'pending_assets'
  | 'pending_payment'
  | 'awaiting_ad_account'
  | 'insufficient_plan'
  | 'launching'
  | 'live'
  | 'paused'
  | 'failed_to_launch'
  | 'error';

type CreativeGenBody = {
  productName: string;
  productPrice: string;
  productDescription: string;
  productOccasion: string;
  productFeatures: string[];
  tone: string;
  productCategory: string;
  brandName: string;
  channel: string;
  productImage: string;
  productLink: string;
  campaignType: string;
};

@Injectable()
export class CampaignService {
  private logger = new Logger(CampaignService.name);

  constructor(
    @InjectModel('campaigns') private campaignModel: Model<CampaignDocument>,
    @InjectModel('business') private businessModel: Model<BusinessDoc>,
    @InjectModel('campaign-top-up-requests')
    private topUpRequestModel: Model<CampaignTopUpRequestDoc>,
    private readonly sqsProducer: SqsProducerService,
    private readonly walletService: AmplifyWalletService,
    private readonly shopifyService: ShopifyService,
    private readonly config: AppConfigService,
  ) {}

  private async campaignValidation(params: {
    createCampaignDto: CreateCampaignDto;
    userId: string;
  }) {
    const { createCampaignDto, userId } = params;
    const validation: { message: string; status: CampaignValidationStatus } = {
      status: 'ready_to_launch',
      message: 'Ready to Launch',
    };

    const business = await this.businessModel.findById(
      createCampaignDto.businessId,
    );

    if (!business || business.userId.toString() !== userId.toString()) {
      validation.status = 'validation_failed';
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
      validation.status = 'insufficient_plan';
      validation.message = 'Plan limits exceeded';
      return { validation };
    }

    let googleCreativesCount = 0;
    createCampaignDto.products.forEach((product) => {
      if (!product.creatives || !product.creatives.length) {
        validation.status = 'pending_assets';
        validation.message = 'Product has no creatives';
      }
      product.creatives?.forEach((creative) => {
        if (creative.channel === 'google') {
          googleCreativesCount += creative.data?.length;
        }
      });
    });

    if (
      createCampaignDto.platforms.includes(CampaignPlatform.GOOGLE) &&
      googleCreativesCount < 6
    ) {
      validation.status = 'pending_assets';
      validation.message = `Asset Generation Error Too few assets-Platform- ${CampaignPlatform.GOOGLE}`;
      this.logger.debug(
        `::: User ${userId}. Insufficient assets generated for ${CampaignPlatform.GOOGLE} :::`,
      );
      return { validation, business };
    }
    return { validation, business };
  }

  private async getCreativesWithAmplifyAi(data: CreativeGenBody) {
    try {
      const url = `${this.config.get('AMPLIFY_AI_API_URL')}/api/creatives`;
      const response = await axios.post<{ success: boolean; data: any[] }>(
        url,
        data,
      );
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

  private async generateCreativesForAllProducts(campaignDoc: CampaignDocument) {
    /*  helper function to check if channel creatives are present*/
    const checkChannelCreatives = (
      creatives: CampaignDocument['products'][0]['creatives'],
    ) => {
      let googleCreativesPresent = false;
      let instagramCreativesPresent = false;
      let facebookCreativesPresent = false;

      creatives.forEach((creative) => {
        if (creative.channel === 'instagram') {
          instagramCreativesPresent = true;
        }
        if (creative.channel === 'facebook') {
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

      const { productByIdentifier: shopifyProductData } =
        await this.shopifyService.getShopifyAccountProductById(
          campaignDoc.shopifyAccountId,
          product.shopifyId,
        );

      const data: CreativeGenBody = {
        productName: product.title,
        productPrice: `$${product.price.toString()}`,
        productDescription: product.description,
        productOccasion: product.occasion ?? '',
        productFeatures: [
          ...product.features,
          ...(shopifyProductData.tags ?? []),
          shopifyProductData.category?.name ?? '',
          shopifyProductData.productType ?? '',
          shopifyProductData.handle ?? '',
        ],
        tone: campaignDoc.tone,
        productCategory: product.category,
        brandName: product.title,
        channel: 'FACEBOOK',
        productImage: product.imageLink,
        productLink: product.productLink,
        campaignType: campaignDoc.type,
      };

      const promises: Promise<any>[] = [];
      if (googleSelected && !googleCreativesPresent) {
        // generate google creatives
        const googleCreativePromise = this.getCreativesWithAmplifyAi({
          ...data,
          channel: 'GOOGLE',
        })
          .then((resp) => {
            const creative = {
              data: resp.data.map((d) => JSON.stringify(d)),
              channel: 'GOOGLE',
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
              `Unable to generate creative, channel- GOOGLE, error- ${errorMessage}`,
            );
            throw error;
          });
        promises.push(googleCreativePromise);
      }
      if (facebookSelected && !facebookCreativesPresent) {
        // generate facebook creatives
        // const facebookCreativesPromise = this.getCreativesWithAmplifyAi({
        //   ...data,
        //   channel: 'FACEBOOK',
        // })
        //   .then((resp) => {
        //     console.log(
        //       'I GOT SOME CREATIVES FOR FACEBOOK- ADD THEM TO CAMPAIGN DOC',
        //       resp,
        //     );
        //   })
        //   .catch((error) => {
        //     let errorMessage = 'Something went wrong';
        //     if (error instanceof AxiosError) {
        //       errorMessage = error.response?.data
        //         ? JSON.stringify({ error: error.response?.data })
        //         : 'Undetermined Error';
        //     }
        //     this.logger.debug(
        //       `Unable to generate creative, channel- FACEBOOK, error- ${errorMessage}`,
        //     );
        //     throw error;
        //   });
        // promises.push(facebookCreativesPromise);
      }
      if (instagramSelected && !instagramCreativesPresent) {
        // generate instagram creatives
        // const instagramCreatives = this.getCreativesWithAmplifyAi({
        //   ...data,
        //   channel: 'INSTAGRAM',
        // })
        //   .then((resp) => {
        //     console.log(
        //       'I GOT SOME CREATIVES FOR INSTAGRAM- ADD THEM TO CAMPAIGN DOC',
        //       resp,
        //     );
        //   })
        //   .catch((error) => {
        //     let errorMessage = 'Something went wrong';
        //     if (error instanceof AxiosError) {
        //       errorMessage = error.response?.data
        //         ? JSON.stringify({ error: error.response?.data })
        //         : 'Undetermined Error';
        //     }
        //     this.logger.debug(
        //       `Unable to generate creative, channel- INSTAGRAM, error- ${errorMessage}`,
        //     );
        //     throw error;
        //   });
        // promises.push(instagramCreatives);
      }

      const results = await Promise.allSettled(promises);
      await campaignDoc.save(); // save for the promises that fulfilled

      const rejected = results.filter((r) => r.status === 'rejected');

      console.log({ results: JSON.stringify({ results }) });

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
        `::: Failed to generate creatives for campaign one or more- ${campaignDoc._id.toString()} :::`,
      );
      throw new InternalServerErrorException(
        'Failed to generate creatives for campaign',
      );
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

      if (
        validation.status !== 'ready_to_launch' &&
        validation.status !== 'pending_assets'
      ) {
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
        createdBy: new Types.ObjectId(userId),
        shopifyAccountId: business.integrations.shopify.shopifyAccount,
        _id: campaignId,
      });

      const messagePromises = newCampaign.platforms.map((platform) => {
        this.logger.log(`Initiating message send for platform: ${platform}`);
        return this.sqsProducer.sendMessage(newCampaign, platform);
      });

      //
      try {
        await this.generateCreativesForAllProducts(newCampaign);
        await Promise.all(messagePromises);
        newCampaign.status = CampaignStatus.LAUNCHING;
        await newCampaign.save();
        this.logger.log(
          `All messages for campaign ${newCampaign._id.toString()} were successfully accepted by SQS.`,
        );
      } catch (error) {
        this.logger.error(
          `One or more messages failed to send for campaign ${newCampaign._id.toString()}.`,
          error,
        );

        throw error;
      }

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
        .limit(perPage)
        .exec(),
      this.campaignModel.countDocuments(filter).exec(),
    ]);

    // 5. Construct the paginated response
    const totalPages = Math.ceil(total / perPage);

    return {
      data: campaigns,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
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
}
