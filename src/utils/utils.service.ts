import nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type EmailOptions = {
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class UtilsService {
  private s3: S3Client;
  private logger = new Logger(UtilsService.name);

  constructor(private config: AppConfigService) {
    this.s3 = new S3Client({
      region: this.config.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
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

  async uploadFileToS3(fileName: string, file: Express.Multer.File) {
    const bucket = this.config.get('S3_BUCKET');
    const region = this.config.get('AWS_REGION');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3.send(command);

      const url = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
      return { url };
    } catch (error) {
      this.logger.error('S3 upload failed:', error);
      throw error;
    }
  }
}
