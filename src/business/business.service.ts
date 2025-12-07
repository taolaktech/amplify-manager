import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDoc, UserDoc } from 'src/database/schema';
import {
  CalculateTargetRoasDto,
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
  UpdateBusinessLogo,
} from './dto';
import axios from 'axios';
import { AppConfigService } from 'src/config/config.service';
import { GoogleMapsAutoCompleteResponse } from './business.types';
import { Credentials, UploadService } from 'src/common/file-upload';
import { UtilsService } from 'src/utils/utils.service';
import { ShopifyService } from 'src/shopify/shopify.service';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);
  private awsCredentials: Credentials;
  constructor(
    @InjectModel('users')
    private usersModel: Model<UserDoc>,
    @InjectModel('business')
    private businessModel: Model<BusinessDoc>,
    private configService: AppConfigService,
    private readonly uploadService: UploadService,
    private readonly utilsService: UtilsService,
    private readonly shopifyService: ShopifyService,
  ) {
    this.awsCredentials = {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
      bucketName: this.configService.get('S3_BUCKET'),
    };
  }

  private async getCitesFromGoogleCall(input: string) {
    try {
      const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
      const res = await axios.get<GoogleMapsAutoCompleteResponse>(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&key=${apiKey}`,
      );
      return res.data;
    } catch {
      throw new InternalServerErrorException(
        'cannot retrieve places at this time',
      );
    }
  }

  async setBusinessDetails(userId: Types.ObjectId, dto: SetBusinessDetailsDto) {
    const businessDetails = await this.businessModel.findOneAndUpdate(
      { userId },
      {
        userId,
        companyName: dto.companyName,
        companyRole: dto.companyRole,
        description: dto.description,
        website: dto.website,
        industry: dto.industry,
        teamSize: { min: dto.teamSize.min, max: dto.teamSize.max },
        estimatedMonthlyBudget: {
          currency: 'USD',
          amount: dto.estimatedMonthlyBudget,
        },
        estimatedAnnualRevenue: {
          currency: 'USD',
          amount: dto.estimatedAnnualRevenue,
        },
        ...(dto.contactEmail ? { contactEmail: dto.contactEmail } : {}),
        ...(dto.contactPhone ? { contactPhone: dto.contactPhone } : {}),
      },
      { new: true, upsert: true },
    );

    const user = await this.usersModel.findById(userId);

    if (user) {
      user.onboarding = { ...user.onboarding, isBusinessDetailsSet: true };
      await user.save();
    }

    return businessDetails;
  }

  async getBusiness(userId: Types.ObjectId) {
    let business = await this.businessModel
      .findOne({ userId })
      .populate('integrations.shopify.shopifyAccount');

    if (!business) {
      business = new this.businessModel({
        userId,
      });
    }

    if (business.logoKey) {
      const url = await this.uploadService.getPublicUrl(
        business.logoKey,
        this.awsCredentials,
      );

      business.logo = url;
    }

    return business;
  }

  async setShippingLocations(
    userId: Types.ObjectId,
    dto: SetShippingLocationsDto,
  ) {
    const businessDetails = await this.businessModel.findOneAndUpdate(
      { userId },
      {
        shippingLocations: {
          localShippingLocations: dto.localShippingLocations,
          internationalShippingLocations: dto.internationalShippingLocations,
        },
      },
      { new: true, upsert: true },
    );

    const user = await this.usersModel.findById(userId);

    if (user) {
      user.onboarding = { ...user.onboarding, isShippingDetailsSet: true };
      await user.save();
    }

    return businessDetails.shippingLocations;
  }

  async setBusinessGoals(userId: Types.ObjectId, dto: SetBusinessGoalsDto) {
    const businessDetails = await this.businessModel.findOneAndUpdate(
      { userId },
      { businessGoals: dto },
      { new: true, upsert: true },
    );

    const user = await this.usersModel.findById(userId);

    if (user) {
      user.onboarding = {
        ...user.onboarding,
        isBusinessGoalsSet: true,
      };
      await user.save();
    }

    return businessDetails.businessGoals;
  }

  async getCities(input: string) {
    const data = await this.getCitesFromGoogleCall(input);
    return data.predictions;
  }

  async updateBusinessLogo(
    userId: Types.ObjectId,
    dto: UpdateBusinessLogo,
    file: Express.Multer.File,
  ) {
    try {
      let business = await this.businessModel.findOne({ userId });

      if (!business) {
        business = await this.businessModel.create({
          userId,
        });
      }
      if (file) {
        const { url, key } = await this.uploadService.uploadFile(
          file,
          business._id.toHexString(),
          'logo',
          this.awsCredentials,
          'brand-assets',
        );
        business.logo = url;
        business.logoKey = key;
        await business.save();
      } else if (dto.removeLogo) {
        if (business.logoKey) {
          this.uploadService
            .deleteObject(business.logoKey, this.awsCredentials)
            .then()
            .catch(() =>
              this.logger.error(
                `Error deleting logo file: ${business.logoKey}`,
              ),
            );
        }
        business.logo = undefined;
        business.logoKey = undefined;
        await business.save();
      }

      return business;
    } catch {
      throw new InternalServerErrorException('Unable to upload logo');
    }
  }

  async calculateTargetRoas(
    userId: Types.ObjectId,
    dto: CalculateTargetRoasDto,
  ) {
    const business = await this.businessModel.findOne({ userId });

    if (!business || !business.industry) {
      throw new NotFoundException(`business for this user not found`);
    }
    const budgetPerPlatform = dto.budget / dto.platforms.length;

    const aov = await this.shopifyService.getAOV(userId);

    if (!business.industry) {
      throw new InternalServerErrorException('Business industry not set');
    }

    const res = this.utilsService.calculateTargetRoas({
      budget: budgetPerPlatform,
      industry: business.industry,
      AOV: aov,
    });

    let totalRevenue = 0;

    // format res to only include selected platforms and calculate totalRevenue while doing this
    const formattedResponse = dto.platforms.reduce(
      (acc, platform) => {
        acc.targetRoas[platform] = res.targetRoas[platform];
        acc.estimatedClicks[platform] = res.estimatedClicks[platform];
        acc.estimatedConversions[platform] = res.estimatedConversions[platform];
        acc.estimatedConversionValues[platform] =
          res.estimatedConversionValues[platform];

        totalRevenue += res.estimatedConversionValues[platform] ?? 0;
        return acc;
      },
      {
        targetRoas: {},
        estimatedClicks: {},
        estimatedConversions: {},
        estimatedConversionValues: {},
      } as Pick<
        typeof res,
        | 'targetRoas'
        | 'estimatedClicks'
        | 'estimatedConversions'
        | 'estimatedConversionValues'
      >,
    );

    const totalTargetRoasRatio = dto.budget / totalRevenue;
    const totalPercentageRoas = totalTargetRoasRatio * 100;
    const roasInMultiple = Number(
      ((totalTargetRoasRatio * dto.budget) / 100).toFixed(1),
    );

    return {
      message: `ROAS is ${roasInMultiple}x of campaign spend- $${dto.budget}`,
      roasInMultiple,
      totalBudget: dto.budget,
      budgetPerPlatform,
      totalTargetRoasRatio: Number(totalTargetRoasRatio.toFixed(4)),
      totalPercentageRoas: Number(totalPercentageRoas.toFixed(4)),
      ...res,
      ...formattedResponse,
      budget: undefined,
    };
  }
}
