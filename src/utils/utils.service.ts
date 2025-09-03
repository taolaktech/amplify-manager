import nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import { Industry } from 'src/enums/industry';
import { IndustryRoasBenchMark } from './industry-roas-benchmark';
import { Platform } from './platform';

type EmailOptions = {
  to: string;
  subject: string;
  message: string;
};

@Injectable()
export class UtilsService {
  constructor(private config: AppConfigService) {}
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
  }) {
    const { budget, industry, AOV } = params;

    const industryRoasBenchMark = IndustryRoasBenchMark[industry];

    const estimatedClicks = {
      [Platform.Facebook]: industryRoasBenchMark['Facebook'].maxCpc / budget,
      [Platform.Instagram]: industryRoasBenchMark['Instagram'].maxCpc / budget,
      [Platform.GoogleSearch]:
        industryRoasBenchMark['Google Search'].maxCpc / budget,
    };

    const estimatedConversions = {
      [Platform.Facebook]:
        estimatedClicks[Platform.Facebook] *
        (industryRoasBenchMark['Facebook'].conversionRate / 100),
      [Platform.Instagram]:
        estimatedClicks[Platform.Instagram] *
        (industryRoasBenchMark['Instagram'].conversionRate / 100),
      [Platform.GoogleSearch]:
        estimatedClicks[Platform.GoogleSearch] *
        (industryRoasBenchMark['Google Search'].conversionRate / 100),
    };

    const estimatedConversionValues = {
      [Platform.Facebook]: estimatedConversions[Platform.Facebook] * AOV,
      [Platform.Instagram]: estimatedConversions[Platform.Instagram] * AOV,
      [Platform.GoogleSearch]:
        estimatedConversions[Platform.GoogleSearch] * AOV,
    };

    const targetRoas = {
      [Platform.Facebook]:
        budget / estimatedConversionValues[Platform.Facebook],
      [Platform.Instagram]:
        budget / estimatedConversionValues[Platform.Instagram],
      [Platform.GoogleSearch]:
        budget / estimatedConversionValues[Platform.GoogleSearch],
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
}
