import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceNames } from 'src/common/types/service.types';
import { AppConfigService } from 'src/config/config.service';
import { BusinessDoc } from 'src/database/schema/business.schema';
import {
  InitiateImageGenerationDto,
  InitiateImageGenWithN8n,
  InitiateVideoGenerationDto,
} from './dto';
import { MediaPresetDoc } from 'src/database/schema/media-preset.schema';

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
    dto: InitiateImageGenWithN8n,
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
      type: 'image',
      businessId: business._id.toString(),
      productName: dto.productName,
      productDescription: dto.productDescription,
      productImages: dto.productImages,
      productId: dto.productId,
      headline: dto.headline,
      bodyCopy: dto.bodyCopy,
      cta: dto.cta ?? '',
      mediaPresetId: dto.mediaPresetId,
      mediaPresetPrompt: preset?.prompt,
    };

    const url = `${this.config.get('AMPLIFY_N8N_API_URL')}/webhook/asset/generate
`;

    const resData = await this.postToN8nWebhook<any>(url, payload);

    const assetId =
      typeof resData?.assetId === 'string'
        ? resData.assetId
        : typeof resData?.data?.assetId === 'string'
          ? resData.data.assetId
          : undefined;

    if (!assetId) {
      throw new BadRequestException('Invalid response from asset generation');
    }

    return { assetId };
  }

  async initiateVideoGeneration(
    userId: Types.ObjectId,
    dto: InitiateVideoGenerationDto,
  ) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new BadRequestException('Business not found for this user');
    }

    const videoPreset = await this.mediaPresetModel.findOne({
      _id: dto.videoPresetId,
    });

    if (!videoPreset) {
      throw new BadRequestException('Video preset not found');
    }

    // // TODO: Use nanobanana to generate some things like primary use case, key visual feature, usage environment, product details
    // const { primaryUseCase, keyVisualFeature, usageEnvironment } =
    //   await this.generateProductDetails();

    const seconds: '4' | '8' | '12' =
      videoPreset.duration === 4 ||
      videoPreset.duration === 8 ||
      videoPreset.duration === 12
        ? (String(videoPreset.duration) as '4' | '8' | '12')
        : '8';
    const size = '720x1280';
    const prompt = `
      You are an ad video generation expert. 
      
      Generate a video for ${dto.productName} using the following template: ${videoPreset.prompt}. 
      
      Modify the product details of the template to match the following:
  
      "Product Name": "${dto.productName}"

      "Product Category": "${dto.productCategory}"

      "Product Description": "${dto.productDescription}"
    `;

    this.logger.log(
      `Initiating video generation for product ${dto.productName}`,
      { businessId: business._id.toString() },
    );

    const integrationsRes = await this.internalHttpHelper
      .forService(ServiceNames.AMPLIFY_INTEGRATIONS)
      .post<IntegrationsCreateResponse>(
        'internal/media-generation/initiate-video-gen',
        {
          businessId: business._id.toString(),
          videoPresetId: dto.videoPresetId,
          prompt,
          provider: 'openai',
          model: 'sora-2',
          seconds,
          size,
          quality: 'standard',
        },
      );

    if (!integrationsRes?.success) {
      throw new BadRequestException('Failed to start video generation');
    }

    const providerJobId = integrationsRes.data.id;

    return {
      assetId: integrationsRes.data.assetId,
      providerJobId,
    };
  }

  async initiateImageGeneration(
    userId: Types.ObjectId,
    dto: InitiateImageGenerationDto,
  ) {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new BadRequestException('Business not found for this user');
    }

    const imagePreset = await this.mediaPresetModel.findOne({
      _id: dto.imagePresetId,
    });

    if (!imagePreset) {
      throw new BadRequestException('Image preset not found');
    }

    if (imagePreset.type !== 'image') {
      throw new BadRequestException('Preset is not an image preset');
    }

    const imageUrls = [
      imagePreset.mediaUrl,
      dto.productImage,
      ...(Array.isArray(dto.otherImages) ? dto.otherImages : []),
    ].filter((u) => typeof u === 'string' && u.length > 0);

    const prompt = `Generate an image for ${dto.productName} using the following prompt: ${imagePreset.prompt}. The first image is the template to be used for the image generation and the other images are the other images of the product to be used for the image generation
    {
      "Product Name": "${dto.productName}",
      "Product Category": "${dto.productCategory}",
      "Product Details": "${dto.productDescription}",
      }
      `;

    this.logger.log(
      `Initiating image generation for product ${dto.productName}`,
      { businessId: business._id.toString() },
    );

    const integrationsRes = await this.internalHttpHelper
      .forService(ServiceNames.AMPLIFY_INTEGRATIONS)
      .post<IntegrationsCreateImageResponse>(
        'internal/media-generation/initiate-image-gen',
        {
          businessId: business._id.toString(),
          prompt,
          provider: 'nanobanana',
          numImages: 1,
          imageSize: '9:16', //1:1, 9:16, 16:9, 3:4, 4:3, 3:2, 2:3, 5:4, 4:5, 21:9
          imageUrls,
          imagePresetId: dto.imagePresetId,
        },
      );

    if (!integrationsRes?.success || !integrationsRes?.data?.taskId) {
      throw new BadRequestException('Failed to start image generation');
    }

    return {
      providerJobId: integrationsRes.data.taskId,
      assetId: integrationsRes.data.assetId,
    };
  }
}
