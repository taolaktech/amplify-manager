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
  ApiProperty,
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
import { VideoPresetsService } from 'src/video-presets/video-presets.service';
import { UploadVideoPresetRequestDto } from './dto/upload-video-preset.dto';

class UploadVideoPresetResponseDto {
  @ApiProperty()
  videoUrl: string;

  @ApiProperty()
  thumbnailImageUrl: string;

  @ApiProperty()
  thumbnailVideoUrl: string;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ required: false })
  resolution?: string;
}

@ApiTags('Internal Video Presets')
@ApiSecurity('x-api-key')
@Controller('internal/video-presets')
export class InternalVideoPresetsController {
  private awsCredentials: Credentials;

  constructor(
    private readonly uploadService: UploadService,
    private readonly config: AppConfigService,
    private readonly videoPresetsService: VideoPresetsService,
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

  private async generateThumbnailImage(
    file: Express.Multer.File,
  ): Promise<Buffer> {
    const tempVideoPath = await this.writeTempFile(file, 'video-preset');
    const thumbFilename = `${randomUUID()}.png`;
    const thumbPath = path.join(os.tmpdir(), thumbFilename);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .screenshots({
            timestamps: ['00:00:01'],
            filename: thumbFilename,
            folder: os.tmpdir(),
            size: '640x360',
          });
      });
    } catch {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .screenshots({
            timestamps: ['00:00:00'],
            filename: thumbFilename,
            folder: os.tmpdir(),
            size: '640x360',
          });
      });
    }

    try {
      return await fs.readFile(thumbPath);
    } finally {
      await Promise.all([
        fs.rm(tempVideoPath, { force: true }),
        fs.rm(thumbPath, { force: true }),
      ]);
    }
  }

  private async generateThumbnailVideo(
    file: Express.Multer.File,
  ): Promise<Buffer> {
    const tempVideoPath = await this.writeTempFile(file, 'video-preset');
    const outFilename = `${randomUUID()}.mp4`;
    const outPath = path.join(os.tmpdir(), outFilename);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .outputOptions(['-t 3', '-movflags +faststart', '-vf scale=640:-2'])
          .output(outPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return await fs.readFile(outPath);
    } finally {
      await Promise.all([
        fs.rm(tempVideoPath, { force: true }),
        fs.rm(outPath, { force: true }),
      ]);
    }
  }

  @Post('/upload')
  @ApiOperation({
    summary: 'Upload a video preset, generate thumbnails, and save to DB',
  })
  @ApiResponse({ status: 201, type: UploadVideoPresetResponseDto })
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
  ): Promise<UploadVideoPresetResponseDto> {
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

    const thumbnailImageBuffer = await this.generateThumbnailImage(file);
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

    const thumbnailVideoBuffer = await this.generateThumbnailVideo(file);
    const thumbnailVideoFile: Express.Multer.File = {
      fieldname: 'thumbnailVideo',
      originalname: `${file.originalname}.mp4`,
      encoding: '7bit',
      mimetype: 'video/mp4',
      size: thumbnailVideoBuffer.length,
      buffer: thumbnailVideoBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: undefined as any,
    };

    const thumbnailVideoResult = await this.uploadService.uploadFile(
      thumbnailVideoFile,
      'global',
      'video-presets-thumbnail-video',
      this.awsCredentials,
      'campaign-assets',
    );

    await this.videoPresetsService.create({
      label: body.label,
      videoUrl: videoResult.url,
      videoKey: videoResult.key,
      thumbnailImageUrl: thumbnailImageResult.url,
      thumbnailImageKey: thumbnailImageResult.key,
      thumbnailVideoUrl: thumbnailVideoResult.url,
      thumbnailVideoKey: thumbnailVideoResult.key,
      duration,
      resolution,
    });

    return {
      videoUrl: videoResult.url,
      thumbnailImageUrl: thumbnailImageResult.url,
      thumbnailVideoUrl: thumbnailVideoResult.url,
      duration,
      resolution,
    };
  }
}
