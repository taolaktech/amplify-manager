import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser, RequireActiveSubscription } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { AssetsService } from './assets.service';
import {
  GenerateCopyDto,
  InitiateImageGenerationDto,
  InitiateVideoGenerationDto,
  PreflightMultiGenerationDto,
  RegenerateImageDto,
} from './dto/generate-media.dto';
import { createMulterOptions } from 'src/common/create-multer-options';

@ApiTags('Assets')
@ApiBearerAuth()
// @RequireActiveSubscription()
@Controller('api/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/:id')
  @ApiOperation({ summary: 'Get asset by id' })
  @ApiResponse({ status: 200 })
  async getAssetById(@GetUser() user: UserDoc, @Param('id') id: string) {
    const asset = await this.assetsService.getAssetById({
      assetId: id,
    });

    return {
      message: 'Asset retrieved successfully',
      data: asset,
      status: 'success',
    };
  }

  @Post('/generate-copy')
  async generateCopy(@GetUser() user: UserDoc, @Body() dto: GenerateCopyDto) {
    const response = await this.assetsService.generateCopy(user._id, dto);
    return response;
  }

  @Post('/preflight-multi-generation')
  async preflightMultiGeneration(
    @GetUser() user: UserDoc,
    @Body() dto: PreflightMultiGenerationDto,
  ) {
    const result = await this.assetsService.preflightMultiGeneration(
      user._id,
      dto,
    );

    return {
      message: 'Preflight completed successfully',
      data: result,
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

  @Post('/upload')
  @ApiOperation({ summary: 'Upload a product image to S3' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201 })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createMulterOptions(10 * 1024 * 1024, [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]),
    ),
  )
  async uploadProductImage(
    @GetUser() user: UserDoc,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.assetsService.uploadProductImage(user._id, file);
    return {
      message: 'Image uploaded successfully',
      data: result,
      status: 'success',
    };
  }

  //
}
