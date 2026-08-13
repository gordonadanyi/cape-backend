import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  INVOICE_SCHEDULED_SENT = 'invoice_scheduled_sent',
  REMINDER_SENT = 'reminder_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',
  INVOICE_DUE_TODAY = 'invoice_due_today',
  PAYMENT_FAILED = 'payment_failed',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    required: true,
    index: true,
  })
  userId?: string;

  @Prop({
    required: true,
    enum: NotificationType,
  })
  type?: NotificationType;

  @Prop({
    required: true,
  })
  title?: string;

  @Prop({
    required: true,
  })
  message?: string;

  @Prop({
    required: false,
  })
  invoiceId?: string;

  @Prop({
    required: false,
  })
  paymentReference?: string;

  @Prop({
    default: false,
    index: true,
  })
  isRead?: boolean;

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
