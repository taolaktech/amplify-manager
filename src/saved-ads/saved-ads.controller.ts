import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { SavedAdsService } from './saved-ads.service';
import { ListSavedAdsDto } from './dto/list-saved-ads.dto';
import { CreateSavedAdDto } from './dto/create-saved-ads.dto';

@ApiTags('Saved Ads')
@ApiBearerAuth()
@Controller('api/saved-ads')
export class SavedAdsController {
  constructor(private readonly savedAssetsService: SavedAdsService) {}

  @Get('/')
  @ApiOperation({ summary: 'List saved assets' })
  @ApiResponse({ status: 200 })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listSavedAssets(
    @GetUser() user: UserDoc,
    @Query() dto: ListSavedAdsDto,
  ) {
    const data = await this.savedAssetsService.listSavedAds(user._id, dto);
    return {
      status: 'success',
      message: 'Saved assets retrieved successfully',
      data,
    };
  }

  @Post('/')
  @ApiOperation({ summary: 'Save an asset (create saved-asset)' })
  @ApiResponse({ status: 201 })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createSavedAsset(
    @GetUser() user: UserDoc,
    @Body() dto: CreateSavedAdDto,
  ) {
    const savedAsset = await this.savedAssetsService.createSavedAd(
      user._id,
      dto,
    );
    return {
      status: 'success',
      message: 'Saved asset created successfully',
      data: savedAsset,
    };
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete saved-asset by id' })
  @ApiResponse({ status: 200 })
  async deleteSavedAsset(@GetUser() user: UserDoc, @Param('id') id: string) {
    const deleted = await this.savedAssetsService.deleteSavedAd(user._id, id);
    return {
      status: 'success',
      message: 'Saved asset deleted successfully',
      data: deleted,
    };
  }
}
