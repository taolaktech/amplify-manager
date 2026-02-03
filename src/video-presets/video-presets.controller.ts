import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VideoPreset } from 'src/database/schema/video-preset.schema';
import { VideoPresetsService } from './video-presets.service';

class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  perPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}

class PaginatedVideoPresetsResponse {
  @ApiProperty({ type: [VideoPreset] })
  presets: VideoPreset[];

  @ApiProperty({ type: PaginationMeta })
  pagination: PaginationMeta;
}

class ListVideoPresetsResponse {
  @ApiProperty({ type: PaginatedVideoPresetsResponse })
  data: PaginatedVideoPresetsResponse;
}

@ApiTags('Video Presets')
@ApiBearerAuth()
@Controller('api/video-presets')
export class VideoPresetsController {
  constructor(private readonly videoPresetsService: VideoPresetsService) {}

  @Get('/')
  @ApiOperation({ summary: 'List video presets (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiResponse({ status: 200, type: ListVideoPresetsResponse })
  async list(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPerPage = perPage ? parseInt(perPage, 10) : 20;

    const { presets, pagination } = await this.videoPresetsService.listPaginated(
      {
        page: Number.isFinite(parsedPage) ? parsedPage : 1,
        perPage: Number.isFinite(parsedPerPage) ? parsedPerPage : 20,
      },
    );

    return {
      data: {
        presets,
        pagination,
      },
    };
  }
}
