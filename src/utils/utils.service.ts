import nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';

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
}
