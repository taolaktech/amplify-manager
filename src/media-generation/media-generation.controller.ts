import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { UserDoc } from 'src/database/schema';
import {
  InitiateImageGenerationDto,
  InitiateImageGenWithN8n,
  InitiateVideoGenerationDto,
} from './dto';
import { MediaGenerationService } from './media-generation.service';

@ApiTags('Media Generation')
@ApiBearerAuth()
@Controller('api/media-generation')
export class MediaGenerationController {
  constructor(
    private readonly MediaGenerationService: MediaGenerationService,
  ) {}

  @Post('/video/initiate')
  @ApiOperation({ summary: 'Initiate video generation' })
  @ApiResponse({ status: 201 })
  async initiateVideoGeneration(
    @GetUser() user: UserDoc,
    @Body() dto: InitiateVideoGenerationDto,
  ) {
    const result = await this.MediaGenerationService.initiateVideoGeneration(
      user._id,
      dto,
    );
    return { data: result };
  }

  @Post('/image/initiate')
  @ApiOperation({ summary: 'Initiate image generation' })
  @ApiResponse({ status: 201 })
  async initiateImageGeneration(
    @GetUser() user: UserDoc,
    @Body() dto: InitiateImageGenerationDto,
  ) {
    const result = await this.MediaGenerationService.initiateImageGeneration(
      user._id,
      dto,
    );
    return { data: result };
  }

  @Post('/image/n8n/initiate')
  @ApiOperation({ summary: 'Initiate asset generation with n8n' })
  @ApiResponse({ status: 201 })
  async initiateImageGenerationWithN8N(
    @GetUser() user: UserDoc,
    @Body() dto: InitiateImageGenWithN8n,
  ) {
    const result = await this.MediaGenerationService.initiateAssetGenWithN8n(
      user._id,
      dto,
    );
    return { data: result };
  }
}
