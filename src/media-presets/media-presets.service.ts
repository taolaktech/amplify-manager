import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery } from 'mongoose';
import {
  MediaPreset,
  MediaPresetDoc,
} from 'src/database/schema/media-preset.schema';

@Injectable()
export class MediaPresetsService {
  constructor(
    @InjectModel('media-presets')
    private readonly mediaPresetModel: Model<MediaPresetDoc>,
  ) {}

  private async createPreset(data: {
    label: string;
    prompt: string;
    mediaUrl: string;
    mediaKey: string;
    thumbnailUrl: string;
    thumbnailKey: string;
    type: 'image' | 'video';
    tags?: string[];
    duration?: number;
    resolution?: string;
  }) {
    return this.mediaPresetModel.create({
      label: data.label,
      prompt: data.prompt,
      mediaUrl: data.mediaUrl,
      mediaKey: data.mediaKey,
      thumbnailUrl: data.thumbnailUrl,
      thumbnailKey: data.thumbnailKey,
      type: data.type,
      tags: data.tags ?? [],
      duration: data.duration,
      resolution: data.resolution,
    });
  }

  async createVideoPreset(data: {
    label: string;
    prompt: string;
    videoUrl: string;
    videoKey: string;
    thumbnailImageUrl: string;
    thumbnailImageKey: string;
    tags?: string[];
    duration?: number;
    resolution?: string;
  }) {
    return this.createPreset({
      label: data.label,
      prompt: data.prompt,
      mediaUrl: data.videoUrl,
      mediaKey: data.videoKey,
      thumbnailUrl: data.thumbnailImageUrl,
      thumbnailKey: data.thumbnailImageKey,
      type: 'video',
      tags: data.tags,
      duration: data.duration,
      resolution: data.resolution,
    });
  }

  async createImagePreset(data: {
    label: string;
    prompt: string;
    imageUrl: string;
    imageKey: string;
    thumbnailUrl: string;
    thumbnailKey: string;
    tags?: string[];
    resolution?: string;
  }) {
    return this.createPreset({
      label: data.label,
      prompt: data.prompt,
      mediaUrl: data.imageUrl,
      mediaKey: data.imageKey,
      thumbnailUrl: data.thumbnailUrl,
      thumbnailKey: data.thumbnailKey,
      type: 'image',
      tags: data.tags,
      resolution: data.resolution,
    });
  }

  async listPresets(params: {
    page: number;
    perPage: number;
    type?: string; //'image' | 'video';
    tags?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const perPage = Math.min(100, Math.max(1, params.perPage || 20));
    const skip = (page - 1) * perPage;

    const queryObject: RootFilterQuery<MediaPresetDoc> = {};

    if (params.type) {
      queryObject.type = params.type;
    }

    if (params.tags) {
      queryObject.tags = {
        $in: params.tags.split(',').map((tag) => tag.trim()),
      };
    }

    const [total, presets] = await Promise.all([
      this.mediaPresetModel.countDocuments(queryObject),
      this.mediaPresetModel
        .find(queryObject)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean<MediaPreset[]>(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return {
      presets,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
