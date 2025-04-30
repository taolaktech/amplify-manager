import { Body, Controller, Get, Post } from '@nestjs/common';
import { BusinessDetailsService } from './business-details.service';
import {
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
} from './dto';
import { Types } from 'mongoose';
import { GetUser } from 'src/auth/decorators';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('api/business-details')
export class BusinessDetailsController {
  constructor(private businessDetailsService: BusinessDetailsService) {}

  @Post('/')
  async setBusinessDetails(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetBusinessDetailsDto,
  ) {
    const businessDetails =
      await this.businessDetailsService.setBusinessDetails(userId, dto);
    return { businessDetails };
  }

  @Get('/')
  async getBusinessDetails(@GetUser('_id') userId: Types.ObjectId) {
    const businessDetails =
      await this.businessDetailsService.getBusinessDetails(userId);
    return { businessDetails };
  }

  @Post('/set-shipping-locations')
  async setShippingLocations(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetShippingLocationsDto,
  ) {
    const shippingLocations =
      await this.businessDetailsService.setShippingLocations(userId, dto);
    return { shippingLocations };
  }

  @Post('/set-goals')
  async setBusinessGoals(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetBusinessGoalsDto,
  ) {
    const businessGoals = await this.businessDetailsService.setBusinessGoals(
      userId,
      dto,
    );
    return { businessGoals };
  }
}
