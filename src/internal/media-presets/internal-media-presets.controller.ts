import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/common/create-multer-options';
import { UploadService, Credentials } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MediaPresetsService } from 'src/media-presets/media-presets.service';
import {
  UploadImagePresetRequestDto,
  UploadVideoPresetRequestDto,
} from './dto/upload-media-preset.dto';
import { MediaPreset } from 'src/database/schema';
import { UtilsService } from 'src/utils/utils.service';

@ApiTags('Internal Media Presets')
@ApiSecurity('x-api-key')
@Controller('internal/media-presets')
export class InternalMediaPresetsController {
  private awsCredentials: Credentials;

  constructor(
    private readonly uploadService: UploadService,
    private readonly config: AppConfigService,
    private readonly mediaPresetsService: MediaPresetsService,
    private readonly utilService: UtilsService,
  ) {
    this.awsCredentials = {
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION'),
      bucketName: this.config.get('S3_BUCKET'),
    };

    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }

  private async writeTempFile(
    file: Express.Multer.File,
    prefix: string,
  ): Promise<string> {
    const original = file?.originalname || '';
    const ext = path.extname(original) || '.bin';
    const tempPath = path.join(os.tmpdir(), `${prefix}-${randomUUID()}${ext}`);
    await fs.writeFile(tempPath, file.buffer);
    return tempPath;
  }

  private async probeVideo(file: Express.Multer.File): Promise<{
    duration?: number;
    resolution?: string;
  }> {
    const tempPath = await this.writeTempFile(file, 'video-preset');
    try {
      return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          const duration =
            typeof metadata?.format?.duration === 'number'
              ? metadata.format.duration
              : undefined;

          const videoStream = metadata?.streams?.find(
            (s: any) => s?.codec_type === 'video',
          );

          const width =
            typeof videoStream?.width === 'number'
              ? videoStream.width
              : undefined;
          const height =
            typeof videoStream?.height === 'number'
              ? videoStream.height
              : undefined;

          const resolution = width && height ? `${width}x${height}` : undefined;
          resolve({ duration, resolution });
        });
      });
    } finally {
      await fs.rm(tempPath, { force: true });
    }
  }

  @Post('/video/upload')
  @ApiOperation({
    summary: 'Upload a video preset, generate thumbnails, and save to DB',
  })
  @ApiResponse({ status: 201, type: MediaPreset })
  @ApiBody({ type: UploadVideoPresetRequestDto })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createMulterOptions(250 * 1024 * 1024, [
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ]),
    ),
  )
  @ApiConsumes('multipart/form-data')
  async uploadVideoPreset(
    @Body() body: UploadVideoPresetRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MediaPreset> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const { duration, resolution } = await this.probeVideo(file);

    const videoResult = await this.uploadService.uploadFile(
      file,
      'global',
      'video-presets',
      this.awsCredentials,
      'campaign-assets',
    );

    const thumbnailImageBuffer =
      await this.utilService.generateThumbnailFromVideo(file);
    const thumbnailImageFile: Express.Multer.File = {
      fieldname: 'thumbnailImage',
      originalname: `${file.originalname}.png`,
      encoding: '7bit',
      mimetype: 'image/png',
      size: thumbnailImageBuffer.length,
      buffer: thumbnailImageBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: undefined as any,
    };

    const thumbnailImageResult = await this.uploadService.uploadFile(
      thumbnailImageFile,
      'global',
      'video-presets-thumbnail-image',
      this.awsCredentials,
      'campaign-assets',
    );

    const videoPreset = await this.mediaPresetsService.createVideoPreset({
      label: body.label,
      videoUrl: videoResult.url,
      videoKey: videoResult.key,
      thumbnailImageUrl: thumbnailImageResult.url,
      thumbnailImageKey: thumbnailImageResult.key,
      duration,
      resolution,
      prompt: body.prompt,
      tags: body.tags
        ? body.tags.split(',').map((tag) => tag.toLowerCase().trim())
        : [],
    });

    return videoPreset;
  }

  @Post('/image/upload')
  @ApiOperation({
    summary: 'Upload an image preset and save to DB',
  })
  @ApiResponse({ status: 201, type: MediaPreset })
  @ApiBody({ type: UploadImagePresetRequestDto })
  @UseInterceptors(
    FileInterceptor(
      'file',
      createMulterOptions(250 * 1024 * 1024, ['image/jpeg', 'image/png']),
    ),
  )
  @ApiConsumes('multipart/form-data')
  async uploadImagePreset(
    @Body() body: UploadImagePresetRequestDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MediaPreset> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const imageResult = await this.uploadService.uploadFile(
      file,
      'global',
      'image-presets',
      this.awsCredentials,
      'campaign-assets',
    );

    const thumbnailImageBuffer =
      await this.utilService.generateThumbnailFromImage(file);
    const thumbnailImageFile: Express.Multer.File = {
      fieldname: 'thumbnailImage',
      originalname: `${file.originalname}.png`,
      encoding: '7bit',
      mimetype: 'image/png',
      size: thumbnailImageBuffer.length,
      buffer: thumbnailImageBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: undefined as any,
    };

    const thumbnailImageResult = await this.uploadService.uploadFile(
      thumbnailImageFile,
      'global',
      'image-presets-thumbnail-image',
      this.awsCredentials,
      'campaign-assets',
    );

    const imagePreset = await this.mediaPresetsService.createImagePreset({
      label: body.label,
      prompt: body.prompt,
      tags: body.tags
        ? body.tags.split(',').map((tag) => tag.toLowerCase().trim())
        : [],
      imageUrl: imageResult.url,
      imageKey: imageResult.key,
      thumbnailUrl: thumbnailImageResult.url,
      thumbnailKey: thumbnailImageResult.key,
    });

    return imagePreset;
  }
}
