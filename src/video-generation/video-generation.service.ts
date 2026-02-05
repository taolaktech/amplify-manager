import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceNames } from 'src/common/types/service.types';
import { BusinessDoc } from 'src/database/schema/business.schema';
import { CreativeDoc } from 'src/database/schema/creative.schema';
import { CreateVideoGenerationDto } from './dto/create-video-generation.dto';
import { VideoPresetDoc } from 'src/database/schema';

type IntegrationsCreateResponse = {
  success: boolean;
  data: {
    id: string;
    status: string;
    progress?: number;
    model?: string;
    seconds?: string;
    size?: string;
    quality?: string;
    creativeSetId: string;
  };
};

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  constructor(
    @InjectModel('business')
    private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('creatives')
    private readonly creativeModel: Model<CreativeDoc>,
    @InjectModel('video-presets')
    private readonly videoPresetModel: Model<VideoPresetDoc>,
    private readonly internalHttpHelper: InternalHttpHelper,
  ) {}

  async initiate(userId: Types.ObjectId, dto: CreateVideoGenerationDto) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new BadRequestException('Business not found for this user');
    }

    const videoPreset = await this.videoPresetModel.findOne({
      _id: dto.videoPresetId,
    });

    if (!videoPreset) {
      throw new BadRequestException('Video preset not found');
    }

    const seconds: '4' | '8' | '12' =
      videoPreset.duration === 4 ||
      videoPreset.duration === 8 ||
      videoPreset.duration === 12
        ? (String(videoPreset.duration) as '4' | '8' | '12')
        : '8';
    const size = videoPreset.resolution || '1280x720';
    const prompt = `Create a video ad creative${videoPreset.label ? ` for ${videoPreset.label}` : ''}`;

    const integrationsRes = await this.internalHttpHelper
      .forService(ServiceNames.AMPLIFY_INTEGRATIONS)
      .post<IntegrationsCreateResponse>(
        '/video-generation/internal/videos',
        {
          campaignId: dto.campaignId,
          businessId: business._id.toString(),
          videoPresetId: dto.videoPresetId,
          prompt,
          provider: 'openai',
          model: 'sora-2',
          seconds,
          size,
          quality: 'standard',
        },
        {
          headers: {
            'x-api-key': process.env.INTERNAL_REQUEST_TOKEN as string,
          },
          timeout: 30000,
        },
      );

    if (!integrationsRes?.success) {
      throw new BadRequestException('Failed to start video generation');
    }

    const providerJobId = integrationsRes.data.id;

    return {
      creativeSetId: integrationsRes.data.creativeSetId,
      providerJobId,
    };
  }
}
