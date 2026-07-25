import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true, type: Buffer })
  file: Buffer;

  @Prop({ required: true, default: 'pending' })
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';

  @Prop()
  invoiceNumber?: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  amountDue?: number;

  @Prop()
  dueDate?: Date;

  @Prop()
  note?: string;

  @Prop()
  uploadedBy?: string;

  @Prop()
  subjectLine?: string;

  @Prop()
  personalMessage?: string;

  @Prop([
    {
      originalName: String,
      mimeType: String,
      file: Buffer,
    },
  ])
  attachments?: {
    originalName: string;
    mimeType: string;
    file: Buffer;
  }[];

  @Prop()
  previewText?: string;

  @Prop()
  sendAt?: Date;

  @Prop()
  timeZone?: string;

  @Prop({ default: false })
  isScheduled?: boolean;

  @Prop({ default: false })
  isSent?: boolean;

  @Prop()
  sentAt?: Date;

  @Prop({ default: 0 })
  sendAttempts?: number;

  @Prop()
  lastSendError?: string;

  @Prop([String])
  extractionWarnings?: string[];

  @Prop()
  beforeReminderSentAt?: Date;

  @Prop()
  onDueReminderSentAt?: Date;

  @Prop()
  afterReminderSentAt?: Date;

  @Prop()
  paymentReference?: string;

  @Prop()
  paymentAuthorizationUrl?: string;

  @Prop()
  transactionReference?: string;

  @Prop()
  paymentTransactionId?: string;

  @Prop()
  paymentMethod?: string;

  @Prop()
  paymentChannel?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  amountPaid?: number;

  @Prop()
  receiptSent?: boolean;

  @Prop()
  receiptNumber?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Invoice numbers only need to be unique per-user, not globally — two
// different freelancers both using "INV-001" is normal and shouldn't collide.
InvoiceSchema.index(
  { userId: 1, invoiceNumber: 1 },
  { unique: true, sparse: true },
);
