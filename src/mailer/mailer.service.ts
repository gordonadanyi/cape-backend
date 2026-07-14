import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailAttachment {
  filename: string;
  content: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: SendEmailAttachment[];
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly fromAddress =
    process.env.MAIL_FROM_ADDRESS ?? 'onboarding@resend.dev';

  async sendEmail(params: SendEmailParams): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        'RESEND_API_KEY is not configured. Set it in your envronment before sending email',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      this.logger.error(
        `Resend API error (${response.status}) sending to ${params.to}: ${errorBody}`,
      );
      throw new Error(
        `Failed to send Email (${response.status}): ${errorBody || response.statusText}`,
      );
    }
  }
}
