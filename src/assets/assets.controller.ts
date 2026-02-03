import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { createMulterOptions } from 'src/common/create-multer-options';
import { SaveCampaignAssetDto } from './dto/save-campaign-asset.dto';
import { UploadVideoRequestDto } from './dto/upload-video.dto';
import { UploadService, Credentials } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { AssetsService } from './assets.service';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

class SaveCampaignAssetResponseDto {
  @ApiProperty()
  assetId: string;

  @ApiProperty({ enum: ['saved'] })
  status: 'saved';
}

class UploadVideoResponseDto {
  @ApiProperty()
  storageUrl: string;

  @ApiProperty({ required: false })
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ required: false })
  resolution?: string;
}

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('api')
export class AssetsController {
  private awsCredentials: Credentials;

  constructor(
    private readonly assetsService: AssetsService,
    private readonly uploadService: UploadService,
    private readonly config: AppConfigService,
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

  private async probeVideo(file: Express.Multer.File): Promise<{
    duration?: number;
    resolution?: string;
  }> {
    const tempPath = await this.writeTempFile(file, 'upload');
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

  private async generateThumbnail(file: Express.Multer.File): Promise<Buffer> {
    const tempVideoPath = await this.writeTempFile(file, 'upload');
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
            size: '320x240',
          });
      });
    } catch {
      // If 1 second is too long (short video), fall back to first frame.
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .screenshots({
            timestamps: ['00:00:00'],
            filename: thumbFilename,
            folder: os.tmpdir(),
            size: '320x240',
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

  @Get('assets')
  @ApiOperation({ summary: 'List saved assets' })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false })
  async listAssets(
    @GetUser() user: UserDoc,
    @Query('campaignId') campaignId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: 'image' | 'video',
  ) {
    const assets = await this.assetsService.listAssets({
      userId: user._id,
      campaignId,
      productId,
      type,
    });

    return {
      data: assets,
      status: 'success',
      message: 'Assets retrieved successfully',
    };
  }

  @Post('campaigns/:id/assets/save')
  @ApiOperation({ summary: 'Save an image/video asset to the asset library' })
  @ApiResponse({ status: 201, type: SaveCampaignAssetResponseDto })
  async saveCampaignAsset(
    @GetUser() user: UserDoc,
    @Param('id') campaignId: string,
    @Body() dto: SaveCampaignAssetDto,
  ): Promise<SaveCampaignAssetResponseDto> {
    return this.assetsService.saveCampaignAsset({
      userId: user._id,
      campaignId,
      dto,
    });
  }

  @Post('assets/save')
  @ApiOperation({
    summary: 'Save an image/video asset to the asset library (draft mode)',
  })
  @ApiResponse({ status: 201, type: SaveCampaignAssetResponseDto })
  async saveDraftAsset(
    @GetUser() user: UserDoc,
    @Body() dto: SaveCampaignAssetDto,
  ): Promise<SaveCampaignAssetResponseDto> {
    return this.assetsService.saveDraftAsset({
      userId: user._id,
      dto,
    });
  }

  @Post('assets/upload/video')
  @ApiOperation({ summary: 'Upload a video file and return storage URL' })
  @ApiResponse({ status: 201, type: UploadVideoResponseDto })
  @ApiBody({ type: UploadVideoRequestDto })
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
  async uploadVideo(
    @GetUser() user: UserDoc,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadVideoResponseDto> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const businessId = await this.assetsService.getBusinessIdForUser(user._id);

    const { duration, resolution } = await this.probeVideo(file);

    const result = await this.uploadService.uploadFile(
      file,
      businessId.toHexString(),
      'video',
      this.awsCredentials,
      'campaign-assets',
    );

    const thumbnailBuffer = await this.generateThumbnail(file);
    const thumbnailFile: Express.Multer.File = {
      fieldname: 'thumbnail',
      originalname: `${file.originalname}.png`,
      encoding: '7bit',
      mimetype: 'image/png',
      size: thumbnailBuffer.length,
      buffer: thumbnailBuffer,
      destination: '',
      filename: '',
      path: '',
      stream: undefined as any,
    };

    const thumbResult = await this.uploadService.uploadFile(
      thumbnailFile,
      businessId.toHexString(),
      'thumbnail',
      this.awsCredentials,
      'campaign-assets',
    );

    return {
      storageUrl: result.url,
      thumbnailUrl: thumbResult.url,
      duration,
      resolution,
    };
  }
}
