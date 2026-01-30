import {
  Body,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'src/auth/decorators';
import { UserDoc } from 'src/database/schema';
import { AssetsService } from './assets.service';
import { SaveCampaignAssetDto } from './dto/save-campaign-asset.dto';
import { createMulterOptions } from 'src/common/create-multer-options';
import { UploadService, Credentials } from 'src/common/file-upload';
import { AppConfigService } from 'src/config/config.service';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

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
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(file.buffer as unknown as string, (err, metadata) => {
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
  }

  private async generateThumbnail(file: Express.Multer.File): Promise<Buffer> {
    // Generate a single PNG frame around 1 second (or first frame if shorter)
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const command = ffmpeg(file.buffer as unknown as string)
        .inputFormat('mp4')
        .outputOptions(['-frames:v 1', '-vf scale=1280:-1', '-f image2'])
        .outputFormat('image2')
        .on('error', (err) => reject(err));

      // Seek if possible; ignore seek errors and just try first frame
      try {
        command.seekInput(1);
      } catch {
        // ignore
      }

      const stream = command.pipe();
      stream.on('data', (d: Buffer) => chunks.push(d));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
  }

  @Get('assets')
  @ApiOperation({ summary: 'List saved assets' })
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
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video file and return storage URL' })
  @ApiResponse({ status: 201, type: UploadVideoResponseDto })
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
  async uploadVideo(
    @GetUser() user: UserDoc,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadVideoResponseDto> {
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
