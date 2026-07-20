import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendInvoiceEmail(data: {
    to: string;
    subject: string;
    html: string;
    attachments?: {
      filename: string;
      content: string;
    }[];
  }) {
    const response = await this.resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: data.to,
      subject: data.subject,
      html: data.html,
      attachments: data.attachments,
    });

    // The Resend SDK does NOT throw on API-level failures (bad API key,
    // unverified sending domain, invalid recipient, etc) — it resolves
    // successfully with { data: null, error: {...} }. If we don't check
    // this ourselves, every caller up the chain (sendInvoice, the
    // scheduler, the reminder service) thinks the send succeeded even
    // when Resend silently rejected it.
    if (response.error) {
      throw new Error(
        `Resend error (${response.error.name}): ${response.error.message}`,
      );
    }

    return response;
  }
}
