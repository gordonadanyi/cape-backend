import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import * as crypto from 'crypto';
import { Invoice } from '../schema/invoice.schema';
import { Settings } from '../schema/settings.schema';
import { MailerService } from '../mailer/mailer.service';
import { generateReceiptPdf } from '../utils/receipt-pdf.util';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystack = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<Settings>,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async initializePayment(invoiceId: string) {
    const invoice = await this.invoiceModel.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice already paid');
    }

    if (!invoice.amountDue) {
      throw new BadRequestException(
        'Cannot generate a payment link — this invoice has no amount set.',
      );
    }

    if (!invoice.customerEmail) {
      throw new BadRequestException(
        'Cannot generate a payment link — this invoice has no customer email set.',
      );
    }

    const reference = `INV_${invoice._id}_${Date.now()}`;

    const callbackUrl = `${this.configService.get(
      'FRONTEND_URL',
    )}/payment/success`;

    this.logger.log(`Paystack callback URL: ${callbackUrl}`);
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: invoice.customerEmail,
        amount: invoice.amountDue * 100,
        reference,
        callback_url: callbackUrl,
        metadata: {
          invoiceId: invoice._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.configService.get(
            'PAYSTACK_SECRET_KEY',
          )}`,
          'Content-Type': 'application/json',
        },
      },
    );

    invoice.paymentReference = reference;
    invoice.paymentAuthorizationUrl = response.data.data.authorization_url;

    await invoice.save();

    return {
      authorization_url: response.data.data.authorization_url,
      reference,
    };
  }

  /**
   * Verifies that a webhook request genuinely came from Paystack by
   * recomputing the HMAC SHA512 signature over the *raw* request bytes
   * (not the parsed/re-serialized JSON — that would produce a different
   * byte sequence and always fail) and comparing it to the
   * x-paystack-signature header, using a timing-safe comparison so this
   * check itself can't be attacked via response-time analysis.
   */
  private verifyWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): boolean {
    if (!signature) return false;

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!secret) {
      this.logger.error(
        'PAYSTACK_SECRET_KEY is not configured — cannot verify webhook.',
      );
      return false;
    }

    const expected = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    // Buffers must be equal length for timingSafeEqual, or it throws.
    if (expectedBuf.length !== signatureBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<void> {
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      // Don't reveal *why* verification failed — just refuse it.
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    if (event.event !== 'charge.success') {
      // Paystack sends many event types — we only care about successful
      // charges. Acknowledge anything else without acting on it.
      this.logger.debug(`Ignoring unhandled Paystack event: ${event.event}`);
      return;
    }

    const reference: string | undefined = event.data?.reference;
    if (!reference) {
      this.logger.warn('Paystack webhook missing reference, ignoring.');
      return;
    }

    await this.finalizePaidInvoice(reference, event.data);
  }

  /**
   * Looks up the invoice for a payment reference and returns its current
   * status. This backs the customer-facing success page: on localhost (or
   * any environment Paystack's servers can't reach) the webhook never
   * fires, so instead of trusting the redirect alone, we call Paystack's
   * own verify endpoint here and — if it confirms the charge — finalize
   * the invoice right on this call. If a webhook does arrive later (or
   * already ran), this is a safe no-op read.
   */
  async verifyPayment(reference: string) {
    const invoice = await this.invoiceModel.findOne({
      paymentReference: reference,
    });

    if (!invoice) {
      throw new NotFoundException('No invoice found for this reference');
    }

    if (invoice.status === 'paid') {
      return this.toVerifyResponse(invoice, 'paid');
    }

    const response = await this.paystack.get(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    const paystackStatus: string | undefined = response.data?.data?.status;

    if (paystackStatus === 'success') {
      const updated = await this.finalizePaidInvoice(
        reference,
        response.data.data,
      );
      return this.toVerifyResponse(updated ?? invoice, 'paid');
    }

    if (paystackStatus === 'failed' || paystackStatus === 'abandoned') {
      return this.toVerifyResponse(invoice, 'failed');
    }

    return this.toVerifyResponse(invoice, 'pending');
  }

  private toVerifyResponse(
    invoice: Invoice & { _id: any },
    status: 'paid' | 'failed' | 'pending',
  ) {
    return {
      status,
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      paidAt: invoice.paidAt,
    };
  }

  /**
   * Idempotently marks an invoice paid and sends the receipt. Shared by
   * both the webhook handler and verifyPayment so a customer landing on
   * the success page before (or without) a webhook still gets an accurate,
   * finalized result — and whichever path runs, if a webhook ever does
   * also arrive, is a safe no-op.
   */
  private async finalizePaidInvoice(
    reference: string,
    data: { amount?: number } | undefined,
  ) {
    const invoice = await this.invoiceModel.findOne({
      paymentReference: reference,
    });
    if (!invoice) {
      this.logger.warn(`No invoice found for payment reference ${reference}`);
      return null;
    }

    // Idempotency guard — Paystack can and does retry webhook delivery,
    // and the success-page verify call can race a webhook too. Without
    // this, either path could re-send the receipt email.
    if (invoice.status === 'paid') {
      this.logger.debug(
        `Invoice ${invoice._id} already marked paid, skipping.`,
      );
      return invoice;
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.amountPaid = (data?.amount ?? 0) / 100; // Paystack sends kobo
    await invoice.save();

    this.logger.log(
      `Invoice ${invoice._id} marked paid via Paystack (ref ${reference})`,
    );

    await this.sendReceipt(invoice);

    return invoice;
  }

  private async sendReceipt(invoice: Invoice & { _id: any }): Promise<void> {
    if (!invoice.customerEmail) {
      this.logger.warn(
        `Invoice ${invoice._id} has no customerEmail, cannot send receipt.`,
      );
      return;
    }

    try {
      const settings = await this.settingsModel.findOne({
        userId: invoice.userId,
      });
      const pdfBuffer = await generateReceiptPdf(invoice, settings);

      await this.mailerService.sendInvoiceEmail({
        to: invoice.customerEmail,
        subject: `Payment Receipt — Invoice ${invoice.invoiceNumber || ''}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <p>Hi ${invoice.customerName || 'there'},</p>
            <p>Thank you for your payment. Your receipt is attached.</p>
          </div>
        `,
        attachments: [
          {
            filename: `receipt-${invoice.invoiceNumber || invoice._id}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      });

      this.logger.log(
        `Receipt emailed to ${invoice.customerEmail} for invoice ${invoice._id}`,
      );
    } catch (err) {
      // Payment already succeeded and is already recorded — a failed
      // receipt email shouldn't be treated as a payment failure. Log it
      // for follow-up instead of throwing, since the customer can still
      // download the receipt from the dashboard as a fallback.
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Failed to email receipt for invoice ${invoice._id}: ${message}`,
      );
    }
  }
}