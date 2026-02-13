import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { UserDoc } from 'src/database/schema';
import { InitiateImageGenerationDto, InitiateVideoGenerationDto } from './dto';
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
}
