import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice } from '../schema/invoice.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { buildInvoiceEmailHtml } from 'src/utils/invoice-email.util';
import { Settings } from 'src/schema/settings.schema';
import { PaymentService } from 'src/payment/payment.service';

const POLL_INTERVAL_MS = Number(process.env.INVOICE_POLL_INTERVAL_MS) || 60_000;
const BATCH_SIZE = 20;
// Cap retries so a permanently-broken invoice (bad email, etc.) doesn't get
// hammered against the mail API forever — it'll get flagged via
// lastSendError instead, for a human to look at.
const MAX_SEND_ATTEMPTS = 5;

/**
 * Polls the DB on an interval for invoices that are scheduled and due
 * (isScheduled: true, isSent: false, sendAt <= now) and sends them.
 *
 * This is the "initial invoice send" mechanism — sending the actual invoice
 * to the client once at its scheduled time. Overdue *reminder* emails are a
 * separate concern (they need to track which reminder in the sequence was
 * last sent, per the reminder settings) and are intentionally not handled
 * here yet.
 *
 * Concurrency note: the in-memory `isProcessing` flag prevents a single
 * instance of this service from double-processing if a tick takes longer
 * than the poll interval. It does NOT protect against duplicate sends if
 * you run multiple instances of this backend (e.g. horizontally scaled).
 * If/when you scale horizontally, this needs a real distributed lock
 * (e.g. a claim step via findOneAndUpdate with a `lockedAt` field, or a
 * proper job queue) — flagging that now so it doesn't bite you later.
 */
@Injectable()
export class InvoiceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    private readonly mailerService: MailerService,
    private readonly paymentService: PaymentService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processDueInvoices();
    }, POLL_INTERVAL_MS);
    this.logger.log(
      `Invoice scheduler started, polling every ${POLL_INTERVAL_MS}ms`,
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueInvoices(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Previous tick still running, skipping this one.');
      return;
    }

    this.isProcessing = true;
    try {
      const due = await this.invoiceModel
        .find({
          isScheduled: true,
          isSent: { $ne: true },
          sendAt: { $lte: new Date() },
          sendAttempts: { $lt: MAX_SEND_ATTEMPTS },
        })
        .limit(BATCH_SIZE)
        .exec();

      if (due.length === 0) return;

      this.logger.log(`Found ${due.length} invoice(s) due to send.`);

      for (const invoice of due) {
        await this.sendOne(invoice);
      }
    } catch (err) {
      this.logger.error('Error while polling for due invoices', err as Error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendOne(invoice: Invoice & { _id: any }): Promise<void> {
    if (!invoice.customerEmail) {
      // No point retrying — there's nowhere to send it until a human fixes
      // the draft. Mark it maxed-out immediately instead of burning 5 ticks.
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          sendAttempts: MAX_SEND_ATTEMPTS,
          lastSendError:
            'No customer email on file — add one on the draft screen.',
        },
      );
      this.logger.warn(
        `Invoice ${invoice._id} has no customerEmail, skipping and marking as failed.`,
      );
      return;
    }

    try {
      const attachments = [
        {
          filename: invoice.originalName || 'invoice.pdf',
          content: invoice.file.toString('base64'),
        },
        ...(invoice.attachments ?? []).map((a) => ({
          filename: a.originalName,
          content: a.file.toString('base64'),
        })),
      ];

      const settings = await this.settingsModel.findOne({
        userId: invoice.userId,
      });

      const payment = await this.paymentService.initializePayment(
        invoice._id.toString(),
      );

      await this.mailerService.sendInvoiceEmail({
        to: invoice.customerEmail,
        subject: invoice.subjectLine || 'Invoice',
        html: buildInvoiceEmailHtml(
          invoice,
          settings,
          payment.authorization_url,
        ),
        attachments,
      });

      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          isSent: true,
          sentAt: new Date(),
          lastSendError: null,
        },
      );
      this.logger.log(
        `Sent invoice ${invoice._id} to ${invoice.customerEmail}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown send error';
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          $inc: { sendAttempts: 1 },
          lastSendError: message,
        },
      );
      this.logger.error(
        `Failed to send invoice ${invoice._id} (attempt ${(invoice.sendAttempts ?? 0) + 1}/${MAX_SEND_ATTEMPTS}): ${message}`,
      );
    }
  }
}
