import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('api/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiOperation({ summary: 'List saved assets' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, description: 'image or video' })
  async listAssets(
    @GetUser() user: UserDoc,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    const assets = await this.assetsService.listAssets({
      userId: user._id,
      productId,
      type,
    });

    return {
      data: assets,
      status: 'success',
      message: 'Assets retrieved successfully',
    };
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiResponse({ status: 200 })
  async getAssetById(@GetUser() user: UserDoc, @Param('id') id: string) {
    const asset = await this.assetsService.getAssetById({
      userId: user._id,
      assetId: id,
    });

    return {
      message: 'Asset retrieved successfully',
      data: asset,
      status: 'success',
    };
  }
}
