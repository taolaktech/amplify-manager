import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InternalCampaignService } from './campaign.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';

import { SaveGoogleAdsCampaignDataDto } from './dto/save-googleads-campaign.dto';

@ApiSecurity('x-api-key')
@Controller('internal/campaign')
export class InternalCampaignController {
  constructor(
    private readonly internalCampaignService: InternalCampaignService,
  ) {}

  @ApiOperation({
    summary: 'Get a single campaign by ID',
    description:
      'Retrieves the full details of a specific campaign using its unique MongoDB ObjectId.',
  })
  @ApiResponse({
    status: 200,
    description: 'The campaign was found and returned successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. No campaign with the specified ID exists.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error. An unexpected error occurred on the server.',
  })
  @Get('/:campaignId')
  async findOne(@Param('campaignId') id: string) {
    const campaign = await this.internalCampaignService.findOne(id);
    return {
      data: campaign,
      message: 'Campaign found successfully',
      success: true,
    };
  }

  @Patch('/:campaignId/google-ads/save-data')
  async saveGoogleAdsCampaignState(
    @Param('campaignId') campaignId: string,
    @Body() dto: SaveGoogleAdsCampaignDataDto,
  ) {
    const result = await this.internalCampaignService.saveGoogleAdsCampaignData(
      campaignId,
      dto,
    );
    return {
      data: result,
      message: 'Google Ads campaign state saved successfully',
      success: true,
    };
  }

  @Post('/campaign-creatives/webhook')
  async campaignCreativesWebhook(@Body() payload) {
    await this.internalCampaignService.campaignCreativesWebhook(payload);
    return {
      message: 'Webhook received successfully',
      success: true,
    };
  }
}
