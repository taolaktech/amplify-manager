import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AdLibraryService } from './services/ad-library.service';

@Controller('v1/competitor-ads')
export class CompetitorAdsController {
  constructor(private readonly adLibraryService: AdLibraryService) {}

  @Get('/top')
  async top(
    @Query('niche_id') nicheId: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('time_window', new DefaultValuePipe('7d')) timeWindow:
      | '7d'
      | '30d'
      | '90d',
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
}
