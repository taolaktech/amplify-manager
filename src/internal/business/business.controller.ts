import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InternalBusinessService } from './business.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { SaveGoogleAdsCustomerDataDto } from './dto/save-googleads-data.dto';
import { CalculateTargetRoasDto } from './dto/calculate-target-roas.dto';

@ApiSecurity('x-api-key')
@Controller('internal/business')
export class InternalBusinessController {
  constructor(
    private readonly internalbusinessService: InternalBusinessService,
  ) {}

  @Get('/:businessId')
  async findOne(@Param('businessId') id: string) {
    const business = await this.internalbusinessService.getBusinessById(id);
    return { business };
  }

  @Patch('/:businessId/save-googleads-customer-data')
  @ApiOperation({ summary: 'Save google ads customer data for user' })
  @ApiResponse({
    status: 200,
    description: 'Data saved successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Data already exists',
  })
  async saveGoogleCustomerData(
    @Param('businessId') businessId: string,
    @Body() dto: SaveGoogleAdsCustomerDataDto,
  ) {
    const business =
      await this.internalbusinessService.saveGoogleAdsCustomerData(
        businessId,
        dto,
      );

    return business;
  }

  @Post('/:businessId/calculate-target-roas')
  async calculateTargetRoas(
    @Param('businessId') id: string,
    @Body() dto: CalculateTargetRoasDto,
  ) {
    const business = await this.internalbusinessService.calculateTargetRoas(
      id,
      dto,
    );
    return { business };
  }
}
