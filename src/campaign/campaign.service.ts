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

      return validation;
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
      `::: User ${userId} has created ${campaignCount} Campaigns`,
    );

    // check if user has exceeded their campaign limit
    if (campaignCount >= userPlanAndLimit.campaignLimit) {
      this.logger.debug(
        `::: User ${userId} has reached their campaign limit :::`,
      );
      validation.status = 'insufficient_plan';
      validation.message = 'Plan limits exceeded';
      return validation;
    }

    let googleCreativesCount = 0;
    createCampaignDto.products.forEach((product) => {
      product.creatives.forEach((creative) => {
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
      return validation;
    }
    return validation;
  }

  async create(
    createCampaignDto: CreateCampaignDto,
    userId: Types.ObjectId,
  ): Promise<CampaignDocument> {
    try {
      const validation = await this.campaignValidation({
        createCampaignDto,
        userId: userId.toString(),
      });

      if (validation.status !== 'ready_to_launch') {
        throw new ForbiddenException(validation);
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
        _id: campaignId,
      });

      const messagePromises = newCampaign.platforms.map((platform) => {
        this.logger.log(`Initiating message send for platform: ${platform}`);
        return this.sqsProducer.sendMessage(newCampaign, platform);
      });

      //
      try {
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
