import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessDoc } from 'src/database/schema';
import { UtilsService } from 'src/utils/utils.service';
import { CalcTargetRoasDto } from './dto/calculate-target-roas.dto';
import { ShopifyService } from 'src/shopify/shopify.service';

@Injectable()
export class InternalBusinessService {
  constructor(
    @InjectModel('business')
    private businessModel: Model<BusinessDoc>,
    private utilService: UtilsService,
    private shopifyService: ShopifyService,
  ) {}

  async getBusinessById(businessId: string) {
    const business = await this.businessModel
      .findById(businessId)
      .populate('integrations.shopify.shopifyAccount');

    if (!business) {
      throw new NotFoundException(`business with id ${businessId} not found`);
    }

    return business;
  }

  async calculateTargetRoas(businessId: string, dto: CalcTargetRoasDto) {
    const { budget } = dto;
    const business = await this.businessModel.findById(businessId);
    if (!business) {
      throw new NotFoundException(`business with id ${businessId} not found`);
    }

    const aov = await this.shopifyService.getAOV(business.userId);

    if (!business.industry) {
      throw new NotFoundException(`Business industry not set`);
    }

    return this.utilService.calculateTargetRoas({
      budget,
      industry: business.industry,
      AOV: aov,
    });
  }
}
