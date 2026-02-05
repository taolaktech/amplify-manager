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
import { CreateVideoGenerationDto } from './dto/create-video-generation.dto';
import { VideoGenerationService } from './video-generation.service';

@ApiTags('Video Generation')
@ApiBearerAuth()
@Controller('api/video-generation')
export class VideoGenerationController {
  constructor(
    private readonly videoGenerationService: VideoGenerationService,
  ) {}

  @Post('/initiate')
  @ApiOperation({ summary: 'Initiate video generation' })
  @ApiResponse({ status: 201 })
  async initiate(
    @GetUser() user: UserDoc,
    @Body() dto: CreateVideoGenerationDto,
  ) {
    const result = await this.videoGenerationService.initiate(user._id, dto);
    return { data: result };
  }
}
