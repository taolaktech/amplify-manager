import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators';
import { IUploadedFiles } from 'src/common/interfaces/file.interface';
import { ValidationTransformPipe } from 'src/common/pipes/validation-transform.pipe';
import { BrandAsset, UserDoc } from 'src/database/schema';
import { BrandAssetService } from './brand-asset.service';
import { CreateBrandDto } from './dto/create-brand-asset.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateBrandAssetDto } from './dto/update-brand-asset.dto';
import { ApiResponseDto } from 'src/common/api-response.dto';

export class GetBrandAssetResponseDto extends ApiResponseDto<BrandAsset> {
  @ApiProperty({ type: BrandAsset })
  data: BrandAsset;
}

export class CreateBrandAssetResponseDto extends ApiResponseDto<BrandAsset> {
  @ApiProperty({ type: BrandAsset })
  data: BrandAsset;
}

export class UpdateBrandAssetResponseDto extends ApiResponseDto<BrandAsset> {
  @ApiProperty({ type: BrandAsset })
  data: BrandAsset;
}

@ApiTags('Brand Asset')
@ApiBearerAuth()
@Controller('brand-asset')
export class BrandAssetController {
  constructor(
    private readonly validationTransformPipe: ValidationTransformPipe,
    private readonly brandAssetService: BrandAssetService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new brand asset profile',
    description: 'Creates a new brand asset profile with associated files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'A mix of files and a JSON data object for the new brand asset.',
    schema: {
      type: 'object',
      properties: {
        primaryLogo: { type: 'string', format: 'binary' },
        secondaryLogo: { type: 'string', format: 'binary' },
        brandGuide: { type: 'string', format: 'binary' },
        createDto: {
          type: 'object',
          $ref: `#/components/schemas/${CreateBrandDto.name}`,
          description: 'A stringified JSON object of the CreateBrandDto.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully created.',
    type: CreateBrandAssetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'primaryLogo', maxCount: 1 },
      { name: 'secondaryLogo', maxCount: 1 },
      { name: 'brandGuide', maxCount: 1 },
    ]),
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createBrandAsset(
    @GetUser() user: UserDoc,
    @Body() createBrandDto: CreateBrandDto,
    @UploadedFiles(new ValidationTransformPipe()) files: IUploadedFiles,
  ): Promise<{ data: BrandAsset; message: string; status: string }> {
    const createdBrandAsset = await this.brandAssetService.createBrandAsset(
      createBrandDto,
      files,
      user._id,
    );

    return {
      data: createdBrandAsset,
      message: 'Brand asset created successfully',
      status: 'success',
    };
  }

  @Patch()
  @ApiOperation({
    summary: 'Update brand assets',
    description:
      'Partially updates brand assets. Upload new files to replace existing ones, or send boolean flags to remove them.',
  })
  @ApiConsumes('multipart/form-data') // Crucial: Tells Swagger this is a multipart request
  @ApiBody({
    description:
      'A mix of files and a JSON data object. The `updateDto` field must be a stringified JSON of the UpdateBrandAssetDto.',
    schema: {
      type: 'object',
      properties: {
        // 1. Describe the file fields
        primaryLogo: {
          type: 'string',
          format: 'binary',
          description: 'A new primary logo file to replace the existing one.',
        },
        secondaryLogo: {
          type: 'string',
          format: 'binary',
          description: 'A new secondary logo file to replace the existing one.',
        },
        brandGuide: {
          type: 'string',
          format: 'binary',
          description: 'A new brand guide file to replace the existing one.',
        },
        // 2. Describe the JSON DTO field
        updateDto: {
          type: 'object',
          // This links the swagger docs to our DTO's definition
          $ref: `#/components/schemas/${UpdateBrandAssetDto.name}`,
          description:
            'A stringified JSON object containing update data. E.g., `{"primaryColor":"#FFFFFF", "removeSecondaryLogo":true}`',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'The brand asset was successfully updated.',
    type: UpdateBrandAssetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Brand asset profile not found.' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'primaryLogo', maxCount: 1 },
      { name: 'secondaryLogo', maxCount: 1 },
      { name: 'brandGuide', maxCount: 1 },
    ]),
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateBrandAsset(
    @Body() updateBrandDto: UpdateBrandAssetDto,
    @UploadedFiles(new ValidationTransformPipe()) files: IUploadedFiles,
    @GetUser() user: UserDoc,
  ): Promise<{ data: BrandAsset; message: string; status: string }> {
    const updatedBrandAsset = await this.brandAssetService.updateBrandAsset(
      updateBrandDto,
      files,
      user._id,
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
