import nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { Industry } from 'src/enums/industry';
import { IndustryRoasBenchMark } from './industry-roas-benchmark';
import { Platform } from './platform';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

type EmailOptions = {
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class UtilsService {
  constructor(private config: AppConfigService) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }
  private createMailTransporter() {
    const user = this.config.get('SMTP_USERNAME');
    const pass = this.config.get('SMTP_PASSWORD');
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');

    const transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });
    return transporter;
  }

  async sendEmail(options: EmailOptions) {
    try {
      const transporter = this.createMailTransporter();

      const from = this.config.get('SMTP_FROM');

      // Define mail options
      const mailOptions = {
        from, //'"Akinola" <akinola@gmail.com>'
        to: options.to,
        subject: options.subject,
        html: options.message,
      };

      // Send email
      await transporter.sendMail(mailOptions);
    } catch (error: any) {
      console.error({ error });
    }
  }

  calculateTargetRoas(params: {
    budget: number;
    industry: Industry;
    AOV: number;
    precision?: number;
  }) {
    const { budget, industry, AOV, precision = 4 } = params;

    const round = (n: number) =>
      Number(Number.isFinite(n) ? n.toFixed(precision) : n);

    const industryRoasBenchMark = IndustryRoasBenchMark[industry];

    const estimatedClicks = {
      [Platform.Facebook]: budget / industryRoasBenchMark['Facebook'].cpc,
      [Platform.Instagram]: budget / industryRoasBenchMark['Instagram'].cpc,
      [Platform.GoogleSearch]:
        budget / industryRoasBenchMark['Google Search'].cpc,
    };

    const estimatedConversions = {
      [Platform.Facebook]:
        (estimatedClicks[Platform.Facebook] *
          industryRoasBenchMark['Facebook'].conversionRate) /
        100,
      [Platform.Instagram]:
        (estimatedClicks[Platform.Instagram] *
          industryRoasBenchMark['Instagram'].conversionRate) /
        100,
      [Platform.GoogleSearch]:
        (estimatedClicks[Platform.GoogleSearch] *
          industryRoasBenchMark['Google Search'].conversionRate) /
        100,
    };

    const estimatedConversionValues = {
      [Platform.Facebook]: estimatedConversions[Platform.Facebook] * AOV,
      [Platform.Instagram]: estimatedConversions[Platform.Instagram] * AOV,
      [Platform.GoogleSearch]:
        estimatedConversions[Platform.GoogleSearch] * AOV,
    };

    const targetRoas = {
      [Platform.Facebook]: round(
        (budget / estimatedConversionValues[Platform.Facebook]) * 100,
      ),
      [Platform.Instagram]: round(
        (budget / estimatedConversionValues[Platform.Instagram]) * 100,
      ),
      [Platform.GoogleSearch]: round(
        (budget / estimatedConversionValues[Platform.GoogleSearch]) * 100,
      ),
    };

    return {
      budget,
      AOV,
      targetRoas,
      estimatedClicks,
      estimatedConversions,
      estimatedConversionValues,
    };
  }

  extractIdsFromGoogleResourceName(resourceName: string) {
    // Example resource name: customers/1234567890/campaigns/987654321
    const parts = resourceName.split('/');
    if (parts.length >= 4) {
      const customerId = parts[1];
      const resourceName = parts[2];
      const resourceId = parts[3];
      return { customerId, resourceName, resourceId };
    }
  }

  getPaginationMeta(params: { page: number; perPage: number; total: number }) {
    const totalPages = Math.ceil(params.total / params.perPage);
    return {
      total: params.total,
      page: params.page,
      perPage: params.perPage,
      totalPages,
      hasNextPage: params.page < totalPages,
      hasPrevPage: params.page > 1,
    };
  }

  async probeVideo(file: Express.Multer.File): Promise<{
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

  async generateThumbnailFromVideo(file: Express.Multer.File): Promise<Buffer> {
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

  async generateThumbnailFromImage(file: Express.Multer.File): Promise<Buffer> {
    const tempImagePath = await this.writeTempFile(file, 'upload-image');
    const thumbFilename = `${randomUUID()}.png`;
    const thumbPath = path.join(os.tmpdir(), thumbFilename);

    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempImagePath)
          .outputOptions([
            '-frames:v 1',
            '-vf scale=320:-1:force_original_aspect_ratio=decrease',
          ])
          .output(thumbPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return await fs.readFile(thumbPath);
    } catch {
      return file.buffer;
    } finally {
      await Promise.all([
        fs.rm(tempImagePath, { force: true }),
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
}
