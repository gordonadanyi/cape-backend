import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateInvoiceStatusDto } from '../dto/update-invoice.dto';
import { UpdateInvoiceDraftDto } from '../dto/update-invoicedraft.dto';
import { Invoice } from '../schema/invoice.schema';
import pdfParse from 'pdf-parse';
import { Response } from 'express';
import { PdfInvoiceExtractor } from 'src/utils/pdf-extractor.util';
import { MailerService } from 'src/mailer/mailer.service';
import { buildInvoiceEmailHtml } from 'src/utils/invoice-email.util';
import { Settings } from 'src/schema/settings.schema';

@Injectable()
export class InvoiceService {
  private readonly extractor = new PdfInvoiceExtractor();

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    private readonly mailerService: MailerService,
  ) {}

  /** Throws a clean 400 instead of letting an invalid id crash into an unhandled Mongoose CastError. */
  private assertValidId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid invoice id');
    }
  }

  async uploadInvoice(
    userId: Types.ObjectId,
    file: any,
    body: { note?: string; uploadedBy?: string },
  ): Promise<Invoice> {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const safeFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;

    // TODO: once Settings is easily reachable here, pass the user's actual
    // dateFormat preference instead of the schema default, so ambiguous
    // numeric dates (e.g. 03/04/2026) are read the way this user expects.
    let parsed: { text?: string };
    try {
      parsed = await pdfParse(file.buffer);
    } catch (err) {
      // pdf-parse throws things like "bad XRef entry" when the PDF's
      // internal structure is corrupted/malformed — not something we can
      // recover from, but the user deserves a clear reason instead of an
      // unhandled 500.
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `Failed to parse uploaded PDF "${file.originalname}":`,
        err,
      );
      throw new BadRequestException(
        `This PDF couldn't be read (${message}). It may be corrupted — try re-exporting or re-saving it and upload again.`,
      );
    }

    const { data: extracted, warnings } = this.extractor.extract(
      parsed.text || '',
      'DD/MM/YYYY',
    );

    if (warnings.length) {
      console.log('Invoice extraction warnings:', warnings);
    }

    try {
      return await this.invoiceModel.create({
        userId,
        fileName: safeFileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        file: file.buffer,
        status: 'pending',
        note: body.note,
        uploadedBy: body.uploadedBy,
        invoiceNumber: extracted.invoiceNumber,
        customerName: extracted.customerName,
        customerEmail: extracted.customerEmail,
        amountDue: extracted.amountDue,
        dueDate: extracted.dueDate,
        subjectLine: this.buildSubjectLine(extracted.customerName),
        personalMessage: this.buildDefaultMessage(extracted.customerName),
        previewText: this.buildPreviewText(
          extracted.customerName,
          extracted.amountDue,
        ),
        extractionWarnings: warnings,
      });
    } catch (err) {
      // Duplicate (userId, invoiceNumber) — most likely the same invoice
      // uploaded twice, or a genuine number clash across two of this user's
      // clients. Either way, a raw Mongo E11000 shouldn't reach the client
      // as an unhandled 500.
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          extracted.invoiceNumber
            ? `You already have an invoice numbered "${extracted.invoiceNumber}". Please resolve the conflict before re-uploading.`
            : 'This invoice conflicts with one you already uploaded.',
        );
      }
      throw err;
    }
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    );
  }

  async sendInvoice(userId: Types.ObjectId, id: string) {
    const invoice = await this.invoiceModel.findOne({
      _id: id,
      userId,
    });

    if (!invoice) {
      throw new NotFoundException();
    }

    if (invoice.isSent) {
      throw new ConflictException('This invoice has already been sent.');
    }

    if (!invoice.customerEmail) {
      throw new BadRequestException(
        'This invoice has no customer email on file. Add one on the review screen before sending.',
      );
    }

    const settings = await this.settingsModel.findOne({
      userId: invoice.userId,
    });
    try {
      await this.mailerService.sendInvoiceEmail({
        to: invoice.customerEmail,
        subject: invoice.subjectLine || 'Invoice',
        html: buildInvoiceEmailHtml(invoice, settings),
        attachments: [
          {
            filename: invoice.originalName,
            content: invoice.file.toString('base64'),
          },
        ],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown error sending email';

      await this.invoiceModel.updateOne(
        { _id: invoice._id },
        { $inc: { sendAttempts: 1 }, lastSendError: message },
      );

      throw new BadRequestException(`Failed to send this invoice: ${message}`);
    }

    await this.invoiceModel.updateOne(
      { _id: invoice._id },
      { isSent: true, sentAt: new Date(), lastSendError: null },
    );

    return {
      message: 'Invoice sent successfully.',
    };
  }

  async findAll(userId: Types.ObjectId): Promise<Invoice[]> {
    return this.invoiceModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(userId: Types.ObjectId, id: string): Promise<Invoice> {
    this.assertValidId(id);

    const invoice = await this.invoiceModel
      .findOne({ _id: id, userId })
      .select('-file -attachments.file')
      .exec();

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return invoice;
  }

  async getInvoiceFile(userId: Types.ObjectId, id: string, res: Response) {
    this.assertValidId(id);
    const invoice = await this.invoiceModel.findOne({ _id: id, userId });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    res.set({
      'Content-Type': invoice.mimeType,
      'Content-Disposition': `inline; filename="${invoice.originalName}"`,
    });

    return res.send(invoice.file);
  }

  // async findOne(id: string): Promise<Invoice> {
  //   const invoice = await this.invoiceModel.findById(id).exec();

  //   if (!invoice) {
  //     throw new NotFoundException(`Invoice with id ${id} not found`);
  //   }

  //   return invoice;
  // }

  async updateStatus(
    userId: Types.ObjectId,
    id: string,
    updateDto: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    this.assertValidId(id);

    const updatedInvoice = await this.invoiceModel
      .findOneAndUpdate(
        { _id: id, userId },
        {
          status: updateDto.status,
          ...(updateDto.description !== undefined && {
            note: updateDto.description,
          }),
        },
        { new: true },
      )
      .exec();

    if (!updatedInvoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return updatedInvoice;
  }

  async createDraft(
    userId: Types.ObjectId,
    id: string,
    draft: UpdateInvoiceDraftDto,
  ): Promise<Invoice> {
    this.assertValidId(id);

    const existing = await this.invoiceModel.findOne({ _id: id, userId });
    if (!existing) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    const updatedInvoice = await this.invoiceModel
      .findOneAndUpdate(
        { _id: id, userId },
        {
          ...draft,
          dueDate: draft.dueDate ? new Date(draft.dueDate) : undefined,
          sendAt: draft.sendAt ? new Date(draft.sendAt) : undefined,
          // Only touch isScheduled when this request actually sets/changes
          // sendAt — otherwise an unrelated draft edit (e.g. just editing
          // customerName) would silently un-schedule the invoice.
          ...(draft.sendAt !== undefined && { isScheduled: true }),
          extractionWarnings: this.resolveWarnings(
            existing.extractionWarnings,
            draft,
          ),
        },
        { new: true },
      )
      .exec();

    if (!updatedInvoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return updatedInvoice;
  }

  /**
   * Once a user manually fills in / corrects a field on the draft screen,
   * the extraction warning for that specific field is stale and shouldn't
   * keep flagging as "needs review" — otherwise the UI nags forever about
   * something the user already fixed.
   */
  private resolveWarnings(
    currentWarnings: string[] | undefined,
    draft: UpdateInvoiceDraftDto,
  ): string[] {
    if (!currentWarnings?.length) return [];

    const resolvedPrefixes: string[] = [];
    if (draft.invoiceNumber) resolvedPrefixes.push('Invoice number');
    if (draft.customerName) resolvedPrefixes.push('Customer name');
    if (draft.customerEmail) resolvedPrefixes.push('Customer email');
    if (draft.amountDue !== undefined) resolvedPrefixes.push('Amount due');
    if (draft.dueDate) resolvedPrefixes.push('Due date');

    return currentWarnings.filter(
      (warning) =>
        !resolvedPrefixes.some((prefix) => warning.startsWith(prefix)),
    );
  }

  async attachFiles(
    userId: Types.ObjectId,
    id: string,
    files: any[],
  ): Promise<Invoice> {
    this.assertValidId(id);

    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }

    // Store attachments the same way the primary invoice file is stored
    // (Buffer in Mongo) rather than on local disk — keeps storage strategy
    // consistent and matches what the schema actually declares.
    const attachments = files.map((file) => ({
      originalName: file.originalname,
      mimeType: file.mimetype,
      file: file.buffer,
    }));

    const updatedInvoice = await this.invoiceModel
      .findOneAndUpdate(
        { _id: id, userId },
        { $push: { attachments: { $each: attachments } } },
        { new: true },
      )
      .exec();

    if (!updatedInvoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    return updatedInvoice;
  }

  async remove(userId: Types.ObjectId, id: string): Promise<Invoice> {
    this.assertValidId(id);

    const deletedInvoice = await this.invoiceModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deletedInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    return deletedInvoice;
  }

  private buildSubjectLine(customerName?: string): string {
    return customerName
      ? `Invoice Reminder for ${customerName}`
      : 'Invoice Reminder';
  }

  private buildDefaultMessage(customerName?: string): string {
    return customerName
      ? `Hello ${customerName},\n\nPlease find the attached invoice for your review. Thank you for your prompt attention.`
      : 'Hello,\n\nPlease find the attached invoice for your review. Thank you for your prompt attention.';
  }

  private buildPreviewText(customerName?: string, amountDue?: number): string {
    const amount = amountDue ? ` for ${amountDue}` : '';
    return customerName
      ? `Review your invoice${amount} from us.`
      : 'Review your invoice from us.';
  }
}
