import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MediaPreset } from 'src/database/schema/media-preset.schema';
import { MediaPresetsService } from './media-presets.service';
import { SearchMediaPresetsDto } from './dto/search-media-presets.dto';

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

@ApiTags('Media Presets')
@ApiBearerAuth()
@Controller('api/media-presets')
export class MediaPresetsController {
  constructor(private readonly mediaPresetsService: MediaPresetsService) {}

  @Post('/search')
  @ApiOperation({ summary: 'Search / list media presets (paginated)' })
  @ApiResponse({ status: 200, type: ListVideoPresetsResponse })
  async searchPresets(@Body() dto: SearchMediaPresetsDto) {
    const { presets, pagination } = await this.mediaPresetsService.listPresets({
      page: dto.page ?? 1,
      perPage: dto.perPage ?? 20,
      type: dto.type,
      tags: dto.tags,
      creativeDirections: dto.creativeDirections,
      niches: dto.niches,
    });

    return {
      data: {
        presets,
        pagination,
      },
    };
  }
}
