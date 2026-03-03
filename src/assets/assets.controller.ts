import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
import {
  InitiateImageGenerationDto,
  InitiateVideoGenerationDto,
  RegenerateImageDto,
} from './dto/generate-media.dto';
import {
  GenerateVideoScriptDto,
  GenerateImageAdCopyDto,
} from './dto/generate-copy.dto';

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

  @Post('/generate-image')
  async generateImageAsset(
    @GetUser() user: UserDoc,
    @Body() dto: InitiateImageGenerationDto,
  ) {
    const response = await this.assetsService.generateImageAsset(user._id, dto);

    return {
      message: 'Asset generated successfully',
      data: response,
      status: 'success',
    };
  }

  @Post('/generate-video')
  async generateVideoAsset(
    @GetUser() user: UserDoc,
    @Body() dto: InitiateVideoGenerationDto,
  ) {
    const response = await this.assetsService.generateVideoAsset(user._id, dto);

    return {
      message: 'Asset generated successfully',
      data: response,
      status: 'success',
    };
  }

  @Post('/regenerate-image')
  async regenerateImageAsset(
    @GetUser() user: UserDoc,
    @Body() dto: RegenerateImageDto,
  ) {
    const response = await this.assetsService.reGenerateImageAsset(
      user._id,
      dto,
    );

    return {
      message: 'Asset regenerated successfully',
      data: response,
      status: 'success',
    };
  }

  @Post('/generate-video-script')
  @ApiOperation({
    summary:
      'Generate an ad video script using AI given product and preset info',
  })
  async generateVideoScript(
    @GetUser() user: UserDoc,
    @Body() dto: GenerateVideoScriptDto,
  ) {
    const result = await this.assetsService.generateVideoScript(user._id, dto);
    return {
      message: 'Video script generated successfully',
      data: result,
      status: 'success',
    };
  }

  @Post('/generate-image-ad-copy')
  @ApiOperation({
    summary: 'Generate headline, description, and CTA for an image ad using AI',
  })
  async generateImageAdCopy(
    @GetUser() user: UserDoc,
    @Body() dto: GenerateImageAdCopyDto,
  ) {
    const result = await this.assetsService.generateImageAdCopy(user._id, dto);
    return {
      message: 'Image ad copy generated successfully',
      data: result,
      status: 'success',
    };
  }

  //
}
