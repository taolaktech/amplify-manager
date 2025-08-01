import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators';
import { IUploadedFiles } from 'src/common/interfaces/file.interface';
import { ValidationTransformPipe } from 'src/brand-asset/pipes/validation-transform.pipe';
import { BrandAsset, UserDoc } from 'src/database/schema';
import { BrandAssetService } from './brand-asset.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseDto } from 'src/common/api-response.dto';
import { UpsertBrandAssetDto } from './dto/upsert-brand-asset.dto';

export class GetBrandAssetResponseDto extends ApiResponseDto<BrandAsset> {
  @ApiProperty({ type: BrandAsset })
  data: BrandAsset;
}

export class UpdateBrandAssetResponseDto extends ApiResponseDto<BrandAsset> {
  @ApiProperty({ type: BrandAsset })
  data: BrandAsset;
}

@ApiTags('Brand Asset')
@ApiBearerAuth()
@Controller('api/brand-asset')
export class BrandAssetController {
  constructor(private readonly brandAssetService: BrandAssetService) {}

  @Put('/')
  @ApiOperation({
    summary: 'Update Or Create Brand Assets',
    description:
      'Upload new files to replace existing ones, or send boolean flags to remove them.',
  })
  @ApiConsumes('multipart/form-data') // Crucial: Tells Swagger this is a multipart request
  @ApiResponse({
    status: 200,
    description: 'The brand asset was successfully updated.',
    type: UpdateBrandAssetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'primaryLogo', maxCount: 1 },
      { name: 'secondaryLogo', maxCount: 1 },
      { name: 'brandGuide', maxCount: 1 },
    ]),
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiConsumes('multipart/form-data')
  async upsertBrandAsset(
    @Body() upsertBrandAssetsDto: UpsertBrandAssetDto,
    @UploadedFiles(new ValidationTransformPipe()) files: IUploadedFiles,
    @GetUser() user: UserDoc,
  ): Promise<{ data: BrandAsset; message: string; status: string }> {
    const updatedBrandAsset = await this.brandAssetService.upsertBrandAsset(
      user._id,
      upsertBrandAssetsDto,
      files,
    );

    return {
      data: updatedBrandAsset,
      message: 'Brand asset updated successfully',
      status: 'success',
    };
  }

  @Get()
  @ApiOperation({ summary: "Get the user's brand asset profile" })
  @ApiResponse({
    status: 200,
    description: 'The brand asset profile with fresh, short-lived URLs.',
    type: GetBrandAssetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Brand asset profile not found.' })
  async getBrandAsset(
    @GetUser() user: UserDoc,
  ): Promise<{ data: BrandAsset; message: string; status: string }> {
    const brandAsset = await this.brandAssetService.getBrandAsset(user._id);

    return {
      data: brandAsset,
      message: 'Brand asset retrieved successfully',
      status: 'success',
    };
  }
}
