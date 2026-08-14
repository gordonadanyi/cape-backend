import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

export enum ActivityType {
  INVOICE_CREATED = 'invoice_created',
  INVOICE_UPLOADED = 'invoice_uploaded',
  INVOICE_EDITED = 'invoice_edited',
  INVOICE_DELETED = 'invoice_deleted',
  INVOICE_SCHEDULED = 'invoice_scheduled',
  INVOICE_SENT = 'invoice_sent',
  INVOICE_VIEWED = 'invoice_viewed',
  INVOICE_UPDATED = 'invoice_updated',
  SETTINGS_UPDATED = 'settings_updated',
  PAYMENT_INITIALIZED = 'payment_initialized',
  PAYMENT_VERIFIED = 'payment_verified',
}

@Schema({ timestamps: true })
export class Activity {
  @Prop({
    required: true,
    index: true,
  })
  userId?: string;

  @Prop({
    required: true,
    enum: ActivityType,
  })
  type?: ActivityType;

  @Prop({
    required: true,
  })
  title?: string;

  @Prop({
    required: true,
  })
  description?: string;

  @Prop({
    required: false,
  })
  invoiceId?: string;

  @Prop({
    required: false,
  })
  paymentReference?: string;

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
