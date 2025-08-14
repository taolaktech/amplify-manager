import { Controller, Get, Param } from '@nestjs/common';
import { InternalCampaignService } from './campaign.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';

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
}
