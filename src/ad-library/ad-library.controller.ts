import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AdLibraryService } from './services/ad-library.service';
import { Types } from 'mongoose';
import { GetUser } from 'src/auth/decorators';
import { ApiOperation } from '@nestjs/swagger';

@Controller('/api/ad-library')
export class AdLibraryController {
  constructor(private readonly adLibraryService: AdLibraryService) {}

  @ApiOperation({
    summary: 'default ads library data after scoring (Top ads feed)',
    description: 'Get top competitor ads for a specific niche',
  })
  @Get('/competitor-ads/top')
  async topCompetitorAds(
    @GetUser('_id') userId: Types.ObjectId,
    @Query('niche_id') nicheId: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('time_window', new DefaultValuePipe('7d'))
    timeWindow: '7d' | '30d' | '90d',
  ) {
    const data = await this.adLibraryService.getTopCompetitorAds({
      nicheId,
      limit,
      timeWindow,
    });

    return {
      data,
      message: 'Top competitor ads retrieved successfully',
      success: true,
    };
  }

  @ApiOperation({
    summary: 'Get competitor ad recommendations',
    description: 'search ads data based on Shopify store connected',
  })
  @Get('/competitor-ads/recommendations')
  async competitorAdRecommendations(
    @GetUser('_id') userId: Types.ObjectId,
    @Query('shop_id') shopId: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('product_ids') productIds?: string,
    @Query('collection_id') collectionId?: string,
    @Query('price_band') priceBand?: string,
    @Query('keywords') keywords?: string,
  ) {
    const data = await this.adLibraryService.getCompetitorAdRecommendations({
      shopId,
      limit,
      cursor,
      productIds,
      collectionId,
      priceBand,
      keywords,
    });

    return {
      data,
      message: 'Competitor ad recommendations retrieved successfully',
      success: true,
    };
  }

  @ApiOperation({
    summary: 'Get amplify templates',
    description: 'Amplify Ad Library/templates',
  })
  @Get('/amplify-templates')
  async getAmplifyTemplates(@GetUser('_id') userId: Types.ObjectId) {
    await new Promise<object>((resolve) => resolve({}));
    return {
      message: 'Amplify templates retrieved successfully',
      success: true,
      data: {},
    };
  }

  // GET /v1/competitor-ads/search?q=&page_name=&page_id=&niche_id=&media_type=&cursor=

  @ApiOperation({
    summary: 'Get competitor ad search',
    description: 'search specific competitor ads',
  })
  @Get('/competitor-ads/search')
  async searchAdsBasedOnCompetitor(@GetUser('_id') userId: Types.ObjectId) {
    // TODO: Is the search directly with facebook ad library or our db?
    await new Promise<object>((resolve) => resolve({}));
    return {
      message: 'Amplify templates retrieved successfully',
      success: true,
      data: {},
    };
  }
}
