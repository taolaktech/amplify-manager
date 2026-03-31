import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { AppConfigService } from 'src/config/config.service';
import { BusinessDoc } from 'src/database/schema/business.schema';
import { MediaPresetDoc } from 'src/database/schema/media-preset.schema';

type InitiateAssetGenWithN8nDtoBase = {
  businessId: string;
  productName: string;
  productDescription: string;
  productImages: string[];
  productId: string;
  mediaPresetId?: string;
  headline?: string;
  bodyCopy?: string;
  cta?: string;
  script?: string;
  customPrompt?: string;
};

type InitiateAssetGenWithN8nImageDto = InitiateAssetGenWithN8nDtoBase & {
  type: 'image';
};

type InitiateAssetGenWithN8nVideoDto = InitiateAssetGenWithN8nDtoBase & {
  type: 'video';
  includeMusic: boolean;
  includeVoiceOver: boolean;
};

type InitiateAssetGenWithN8nDto =
  | InitiateAssetGenWithN8nImageDto
  | InitiateAssetGenWithN8nVideoDto;

type IntegrationsCreateResponse = {
  success: boolean;
  data: {
    id: string;
    assetId: string;
  };
};

type IntegrationsCreateImageResponse = {
  success: boolean;
  data: {
    taskId: string;
    assetId: string;
  };
};

@Injectable()
export class MediaGenerationService {
  private readonly logger = new Logger(MediaGenerationService.name);

  constructor(
    @InjectModel('business')
    private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('media-presets')
    private readonly mediaPresetModel: Model<MediaPresetDoc>,
    private readonly internalHttpHelper: InternalHttpHelper,
    private readonly config: AppConfigService,
  ) {}

  private async postToN8nWebhook<TResponse>(
    url: string,
    payload: unknown,
  ): Promise<TResponse> {
    try {
      const response = await axios.post<TResponse>(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return response.data;
    } catch (e: any) {
      this.logger.error(`Failed to call N8N asset generation webhook`, e);
      throw new BadRequestException('Failed to start asset generation');
    }
  }

  async initiateAssetGenWithN8n(
    userId: Types.ObjectId,
    dto: InitiateAssetGenWithN8nDto,
  ) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new BadRequestException('Business not found for this user');
    }

    const preset = dto.mediaPresetId
      ? await this.mediaPresetModel.findById(dto.mediaPresetId)
      : null;

    if (dto.mediaPresetId && !preset) {
      throw new BadRequestException('Media preset not found');
    }

    const payload = {
      type: dto.type,
      businessId: business._id.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      productId: dto.productId,
      mediaPresetId: dto.mediaPresetId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta,
      script: dto.script,
      customPrompt: dto.customPrompt,
      includeMusic: dto.type === 'video' ? dto.includeMusic : undefined,
      includeVoiceOver: dto.type === 'video' ? dto.includeVoiceOver : undefined,
    };

    const url = `${this.config.get('AMPLIFY_N8N_API_URL')}/webhook/asset/generate`;

    const resData = await this.postToN8nWebhook<{ assetId: string }>(
      url,
      payload,
    );

    const assetId = resData?.assetId;

    if (!assetId) {
      throw new InternalServerErrorException(
        'Invalid response from asset generation',
      );
    }

    return { assetId };
  }
}
