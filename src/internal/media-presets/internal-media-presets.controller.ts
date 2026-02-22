import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  InternalServerErrorException,
  Logger,
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
import { MediaPreset, MediaPresetDoc } from 'src/database/schema';
import { UtilsService } from 'src/utils/utils.service';
import axios from 'axios';

@ApiTags('Internal Media Presets')
@ApiSecurity('x-api-key')
@Controller('internal/media-presets')
export class InternalMediaPresetsController {
  private logger = new Logger(InternalMediaPresetsController.name);
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

    let videoResult:
      | Awaited<ReturnType<UploadService['uploadFile']>>
      | undefined;
    let thumbnailImageResult:
      | Awaited<ReturnType<UploadService['uploadFile']>>
      | undefined;
    let videoPreset: MediaPresetDoc | undefined;

    try {
      const { duration, resolution } = await this.probeVideo(file);

      videoResult = await this.uploadService.uploadFile(
        file,
        'global',
        'video-presets',
        this.awsCredentials,
        'video-presets',
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

      thumbnailImageResult = await this.uploadService.uploadFile(
        thumbnailImageFile,
        'global',
        'video-presets-thumbnail-image',
        this.awsCredentials,
        'video-presets',
      );

      videoPreset = await this.mediaPresetsService.createVideoPreset({
        label: body.label,
        videoUrl: videoResult.url,
        videoKey: videoResult.key,
        thumbnailImageUrl: thumbnailImageResult.url,
        thumbnailImageKey: thumbnailImageResult.key,
        duration,
        resolution,
        tags: body.tags
          ? body.tags.split(',').map((tag) => tag.toLowerCase().trim())
          : [],
      });

      // initiate n8n workflow to generate prompt

      await this.initiateMediaPromptGeneration(videoPreset._id.toString());

      return videoPreset;
    } catch (error) {
      this.logger.error('Failed to upload video preset:', error);
      if (videoResult) {
        await this.uploadService.deleteObject(
          videoResult.key,
          this.awsCredentials,
        );
      }

      if (thumbnailImageResult) {
        await this.uploadService.deleteObject(
          thumbnailImageResult.key,
          this.awsCredentials,
        );
      }

      if (videoPreset) {
        await this.mediaPresetsService.deleteMediaPreset(
          videoPreset._id.toString(),
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to upload video preset');
    }
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

    let imageResult:
      | Awaited<ReturnType<UploadService['uploadFile']>>
      | undefined;
    let thumbnailImageResult:
      | Awaited<ReturnType<UploadService['uploadFile']>>
      | undefined;
    let imagePreset: MediaPresetDoc | undefined;

    try {
      imageResult = await this.uploadService.uploadFile(
        file,
        'global',
        'image-presets',
        this.awsCredentials,
        'image-presets',
      );

      if (!imageResult) {
        throw new InternalServerErrorException('Failed to upload image preset');
      }

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

      thumbnailImageResult = await this.uploadService.uploadFile(
        thumbnailImageFile,
        'global',
        'image-presets-thumbnail-image',
        this.awsCredentials,
        'image-presets',
      );

      if (!thumbnailImageResult) {
        throw new InternalServerErrorException('Failed to upload image preset');
      }

      imagePreset = await this.mediaPresetsService.createImagePreset({
        label: body.label,
        tags: body.tags
          ? body.tags.split(',').map((tag) => tag.toLowerCase().trim())
          : [],
        imageUrl: imageResult.url,
        imageKey: imageResult.key,
        thumbnailUrl: thumbnailImageResult.url,
        thumbnailKey: thumbnailImageResult.key,
      });

      // initiate n8n prompt gen workflow
      await this.initiateMediaPromptGeneration(imagePreset._id.toString());

      return imagePreset;
    } catch (error) {
      this.logger.error('Failed to upload image preset:', error);
      if (imageResult) {
        this.logger.debug('Deleting image result:', imageResult.key);
        await this.uploadService.deleteObject(
          imageResult.key,
          this.awsCredentials,
        );
      }
      if (thumbnailImageResult) {
        this.logger.debug(
          'Deleting thumbnail image result:',
          thumbnailImageResult.key,
        );
        await this.uploadService.deleteObject(
          thumbnailImageResult.key,
          this.awsCredentials,
        );
      }

      if (imagePreset) {
        this.logger.debug('Deleting image preset:', imagePreset._id);
        await this.mediaPresetsService.deleteMediaPreset(
          imagePreset._id.toString(),
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload image preset');
    }
  }

  private async initiateMediaPromptGeneration(
    mediaPresetId: string,
  ): Promise<unknown> {
    const response = await axios
      .post<{ success: boolean }>(
        `${this.config.get('AMPLIFY_N8N_API_URL')}/webhook/media-preset/generate-prompt`,
        {
          mediaPresetId,
        },
      )
      .catch((error) => {
        new Logger('').error(
          'Failed to initiate media prompt generation:',
          error.message,
        );
        throw error;
      });

    if (!response.data.success) {
      throw new InternalServerErrorException(
        'Failed to initiate media prompt generation',
      );
    }

    return response.data;
  }
}
