import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VideoPreset,
  VideoPresetDoc,
} from 'src/database/schema/video-preset.schema';

@Injectable()
export class VideoPresetsService {
  constructor(
    @InjectModel('video-presets')
    private readonly videoPresetModel: Model<VideoPresetDoc>,
  ) {}

  async listPaginated(params: { page: number; perPage: number }) {
    const page = Math.max(1, params.page || 1);
    const perPage = Math.min(100, Math.max(1, params.perPage || 20));
    const skip = (page - 1) * perPage;

    const [total, presets] = await Promise.all([
      this.videoPresetModel.countDocuments({}),
      this.videoPresetModel
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean<VideoPreset[]>(),
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

  async create(data: {
    videoUrl: string;
    videoKey: string;
    thumbnailImageUrl: string;
    thumbnailImageKey: string;
    thumbnailVideoUrl: string;
    thumbnailVideoKey: string;
    duration?: number;
    resolution?: string;
  }) {
    return this.videoPresetModel.create(data);
  }
}
