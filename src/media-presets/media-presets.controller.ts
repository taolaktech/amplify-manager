import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MediaPreset } from 'src/database/schema/media-preset.schema';
import { MediaPresetsService } from './media-presets.service';

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
  @ApiProperty({ type: [MediaPreset] })
  presets: MediaPreset[];

  @ApiProperty({ type: PaginationMeta })
  pagination: PaginationMeta;
}

class ListVideoPresetsResponse {
  @ApiProperty({ type: PaginatedVideoPresetsResponse })
  data: PaginatedVideoPresetsResponse;
}

@ApiTags('Video Presets')
@ApiBearerAuth()
@Controller('api/media-presets')
export class MediaPresetsController {
  constructor(private readonly mediaPresetsService: MediaPresetsService) {}

  @Get('/')
  @ApiOperation({ summary: 'List media presets (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  @ApiQuery({ name: 'type', required: false, description: 'image or video' })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Comma separated tags',
  })
  @ApiResponse({ status: 200, type: ListVideoPresetsResponse })
  async listPresets(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('type') type?: string,
    @Query('tags') tags?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedPerPage = perPage ? parseInt(perPage, 10) : 20;

    const { presets, pagination } = await this.mediaPresetsService.listPresets({
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
      perPage: Number.isFinite(parsedPerPage) ? parsedPerPage : 20,
      type,
      tags,
    });

    return {
      data: {
        presets,
        pagination,
      },
    };
  }
}
