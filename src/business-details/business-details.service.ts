import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDetailsDoc, UserDoc } from 'src/database/schema';
import {
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
} from './dto';
import axios from 'axios';
import { AppConfigService } from 'src/config/config.service';
import { GoogleMapsAutoCompleteResponse } from './business-details.types';

@Injectable()
export class BusinessDetailsService {
  constructor(
    @InjectModel('users')
    private usersModel: Model<UserDoc>,
    @InjectModel('business-details')
    private businessDetailsModel: Model<BusinessDetailsDoc>,
    private configService: AppConfigService,
  ) {}

  private async getCitesFromGoogleCall(input: string) {
    try {
      const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
      const res = await axios.get<GoogleMapsAutoCompleteResponse>(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=(cities)&components=country:us|country:ca&key=${apiKey}`,
      );
      return res.data;
    } catch {
      throw new InternalServerErrorException(
        'cannot retrieve places at this time',
      );
    }
  }

  async setBusinessDetails(userId: Types.ObjectId, dto: SetBusinessDetailsDto) {
    const businessDetails = await this.businessDetailsModel.findOneAndUpdate(
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

  async getBusinessDetails(userId: Types.ObjectId) {
    const businessDetails = await this.businessDetailsModel.findOne({ userId });

    return businessDetails;
  }

  async setShippingLocations(
    userId: Types.ObjectId,
    dto: SetShippingLocationsDto,
  ) {
    const businessDetails = await this.businessDetailsModel.findOneAndUpdate(
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
    const businessDetails = await this.businessDetailsModel.findOneAndUpdate(
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
}
