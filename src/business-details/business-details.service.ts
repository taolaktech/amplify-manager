import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDetailsDoc } from 'src/database/schema';
import {
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
} from './dto';

@Injectable()
export class BusinessDetailsService {
  constructor(
    @InjectModel('business-details')
    private businessDetailsModel: Model<BusinessDetailsDoc>,
  ) {}

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

    return businessDetails.shippingLocations;
  }

  async setBusinessGoals(userId: Types.ObjectId, dto: SetBusinessGoalsDto) {
    const businessDetails = await this.businessDetailsModel.findOneAndUpdate(
      { userId },
      { businessGoals: dto },
      { new: true, upsert: true },
    );

    return businessDetails.businessGoals;
  }
}
