import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice } from '../schema/invoice.schema';
import { Settings } from '../schema/settings.schema';
import { MailerService } from 'src/mailer/mailer.service';
import { buildInvoiceEmailHtml } from 'src/utils/invoice-email.util';
import {
  InvoiceSendJobData,
  INVOICE_SENDING_QUEUE,
} from 'src/types/invoice-send-job.types';
import { PaymentService } from 'src/payment/payment.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/schema/notification.schema';

/**
 * The Worker for the 'invoice-sending' queue — this is what BullMQ calls
 * automatically the moment a scheduled job's time arrives. Replaces the
 * old setInterval-based polling in InvoiceSchedulerService.
 *
 * Jobs only carry the invoice's ID (see InvoiceSendJobData) — we always
 * re-fetch the invoice fresh here, since a job might sit waiting for days
 * and we don't want to send stale data if the draft was edited since.
 */
@Processor(INVOICE_SENDING_QUEUE)
export class InvoiceSendingProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceSendingProcessor.name);

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    private readonly mailerService: MailerService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  /** BullMQ calls this automatically when a job in 'invoice-sending' is due. */
  async process(job: Job<InvoiceSendJobData>): Promise<void> {
    const invoice = await this.invoiceModel.findById(job.data.invoiceId);

    if (!invoice) {
      // Deleted since it was scheduled — nothing to do, and nothing to retry.
      this.logger.warn(
        `Invoice ${job.data.invoiceId} no longer exists, skipping.`,
      );
      return;
    }

    if (invoice.isSent) {
      // Already sent somehow (e.g. manually via the "send now" endpoint)
      // — don't send it twice.
      this.logger.debug(`Invoice ${invoice._id} already sent, skipping.`);
      return;
    }

    if (!invoice.customerEmail) {
      // No point retrying — there's nowhere to send it until a human fixes
      // the draft. We mark it failed directly instead of throwing, so
      // BullMQ won't keep retrying something that can't succeed on its own.
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        {
          lastSendError:
            'No customer email on file — add one on the draft screen.',
        },
      );
      this.logger.warn(
        `Invoice ${invoice._id} has no customerEmail, skipping.`,
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

      // Same as the manual "send now" path — generate the payment link
      // right before building the email. A failure here shouldn't fail
      // the whole scheduled send; better to go out without a pay button
      // than not go out at all.
      if (invoice.amountDue) {
        try {
          const payment = await this.paymentService.initializePayment(
            invoice._id.toString(),
          );
          invoice.paymentAuthorizationUrl = payment.authorization_url;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          this.logger.warn(
            `Could not generate payment link for invoice ${invoice._id}: ${message}`,
          );
        }
      }

      await this.mailerService.sendInvoiceEmail({
        to: invoice.customerEmail,
        subject: invoice.subjectLine || 'Invoice',
        html: buildInvoiceEmailHtml(invoice, settings),
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

      await this.notificationService.create({
        userId: invoice.userId.toString(),
        type: NotificationType.INVOICE_SCHEDULED_SENT,
        title: 'Invoice sent',
        message: invoice.invoiceNumber
          ? `Invoice ${invoice.invoiceNumber} was sent to ${invoice.customerEmail}.`
          : `Invoice was sent to ${invoice.customerEmail}.`,
        invoiceId: invoice._id.toString(),
        metadata: { invoiceNumber: invoice.invoiceNumber },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown send error';

      // Record it for visibility on the invoice itself...
      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        { $inc: { sendAttempts: 1 }, lastSendError: message },
      );

      this.logger.error(
        `Failed to send invoice ${invoice._id} (job attempt ${job.attemptsMade + 1}): ${message}`,
      );

      // ...then re-throw so BullMQ marks this job as failed and schedules
      // a retry itself (per the `attempts`/`backoff` options we'll set
      // when we add the job to the queue in the next step).
      throw err;
    }
  }
}
