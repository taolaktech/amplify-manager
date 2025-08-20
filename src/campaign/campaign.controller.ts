import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { GetUser } from 'src/auth/decorators';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Campaign, UserDoc } from 'src/database/schema';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { CampaignToUpDto } from './dto/campaign-top-up.dto';

class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}

class PaginatedCampaignResponse {
  @ApiProperty({ type: [Campaign] })
  data: Campaign[];

  @ApiProperty({ type: PaginationMeta })
  pagination: PaginationMeta;
}

class CampaignResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Campaign created successfully' })
  message: string;

  // By referencing the Mongoose Campaign class, NestJS's Swagger plugin
  // can automatically generate a detailed model of the returned data.
  @ApiProperty({ type: Campaign })
  data: Campaign;
}

class TopUpCampaignResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Campaign created successfully' })
  message: string;
}

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new campaign',
    description:
      'This endpoint validates and creates a new marketing campaign, persisting it to the database and preparing it for processing.',
  })
  @ApiResponse({
    status: 201,
    description: 'The campaign has been successfully created.',
    type: CampaignResponse, // Use the DTO we defined above
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request. The request body is invalid or missing required fields.',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal Server Error. An unexpected error occurred on the server.',
  })
  async create(
    @GetUser() user: UserDoc,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    const userId = user._id.toString(); // ?? '680690b4b7fe560e4582cf2f';

    const createdCampaign = await this.campaignService.create(
      createCampaignDto,
      userId,
    );

    return {
      data: createdCampaign,
      message: 'Campaign created successfully',
      success: true,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing campaign' })
  @ApiResponse({
    status: 200,
    description: 'Campaign updated successfully.',
    type: CampaignResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. The request body is empty or invalid.',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found. Campaign with the specified ID not found.',
  })
  async update(
    @GetUser() user: UserDoc,
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    const userId = user._id.toString();

    const updatedCampaign = await this.campaignService.update(
      id,
      userId,
      updateCampaignDto,
    );

    return {
      data: updatedCampaign,
      message: 'Campaign updated successfully',
      success: true,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of campaigns.',
    type: PaginatedCampaignResponse,
  })
  async findAll(
    @GetUser() user: UserDoc,
    @Query() listCampaignsDto: ListCampaignsDto,
  ) {
    const userId = user._id.toString();
    const campaigns = await this.campaignService.findAll(
      listCampaignsDto,
      userId,
    );

    return {
      data: campaigns,
      message: 'Campaigns retrieved successfully',
      success: true,
    };
  }

  @Get(':campaignId')
  @ApiOperation({
    summary: 'Get a single campaign by ID',
    description:
      'Retrieves the full details of a specific campaign using its unique MongoDB ObjectId.',
  })
  @ApiResponse({
    status: 200,
    description: 'The campaign was found and returned successfully.',
    type: CampaignResponse,
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
  async findOne(@Param('campaignId') id: string) {
    const campaign = await this.campaignService.findOne(id);

    return {
      data: campaign,
      message: 'Campaign found successfully',
      success: true,
    };
  }

  @Post(':campaignId/top-up')
  @ApiOperation({
    summary: 'Top up a campaign budget',
    description: 'Increases the budget of a campaign by a specified amount.',
  })
  @ApiResponse({
    status: 200,
    description: 'The campaign budget was successfully topped up.',
    type: TopUpCampaignResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid input data.',
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
  async topUpCampaignBudget(
    @GetUser() user: UserDoc,
    @Param('campaignId') id: string,
    @Body() topUpBody: CampaignToUpDto,
  ) {
    await this.campaignService.topUpCampaignBudget(
      user._id.toString(),
      id,
      topUpBody,
    );

    return {
      message: `Successfully topped up campaign budget with $${topUpBody.amount}`,
      success: true,
    };
  }
}
