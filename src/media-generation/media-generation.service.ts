import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceNames } from 'src/common/types/service.types';
import { BusinessDoc } from 'src/database/schema/business.schema';
import { InitiateImageGenerationDto, InitiateVideoGenerationDto } from './dto';
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
  ) {}

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
    const prompt = ` Generate a video for ${dto.productName} using the following prompt: ${videoPreset.prompt}
    {
      "Product Name": "${dto.productName}",
      "Product Category": "${dto.productCategory}",
      "Product Details": "${dto.productDescription}",
      }
      `;
    // "Primary Use Case": "${primaryUseCase}",
    // "Key Visual Feature (must be shown clearly)": "${keyVisualFeature}",
    // "Usage Environment": "${usageEnvironment}"

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
