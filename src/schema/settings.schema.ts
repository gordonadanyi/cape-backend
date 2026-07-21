import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true })
export class Settings {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    type: {
      fullName: String,
      emailAddress: String,
      companyName: String,
      phoneNumber: String,
    },
    default: {
      fullName: '',
      emailAddress: '',
      companyName: '',
      phoneNumber: '',
    },
  })
  profile?: {
    fullName: string;
    emailAddress: string;
    companyName: string;
    phoneNumber: string;
  };

  @Prop({
    type: {
      companyName: String,
      website: String,
      businessAddress: String,
    },
    default: {
      companyName: '',
      website: '',
      businessAddress: '',
    },
  })
  branding?: {
    companyName: string;
    website: string;
    businessAddress: string;
  };

  @Prop({
    type: {
      defaultSubject: String,
      defaultMessage: String,
      signature: String,
    },
    default: {
      defaultSubject: 'Payment Invoice',
      defaultMessage:
        'Hello {{customerName}},\n\nPlease find your invoice attached.',
      signature: 'Best regards,\n{{companyName}}',
    },
  })
  email?: {
    defaultSubject: string;
    defaultMessage: string;
    signature: string;
  };

  @Prop({
    type: {
      beforeDueDate: Boolean,
      beforeDays: Number,
      beforeSubject: String,
      beforeMessage: String,

      onDueDate: Boolean,
      dueTodaySubject: String,
      dueTodayMessage: String,

      afterDueDate: Boolean,
      afterDays: Number,
      overdueSubject: String,
      overdueMessage: String,

      signature: String,
    },
    default: {
      beforeDueDate: true,
      beforeDays: 3,
      beforeSubject: 'Invoice Reminder',
      beforeMessage:
        'Dear Sir/Ma,\n\nI hope this message finds you well Please attached the invoice for our services provided. This is a reminder that your invoice is due in {{days}} day(s).',

      onDueDate: true,
      dueTodaySubject: 'Invoice Due Today',
      dueTodayMessage:
        'Dear Sir/Ma,\n\n I hope this message finds you well Please find attached the invoice for our services provided due today .',

      afterDueDate: true,
      afterDays: 3,
      overdueSubject: 'Invoice Overdue',
      overdueMessage:
        'Hello Sir/Ma,\n\nI hope this message finds you well Please find attached the invoice for our services provided.Your invoice is now overdue. Kindly make payment as soon as possible.',

      signature: 'Best regards,\n{{companyName}}',
    },
  })
  reminders?: {
    beforeDueDate: boolean;
    beforeDays: number;
    beforeSubject: string;
    beforeMessage: string;

    onDueDate: boolean;
    dueTodaySubject: string;
    dueTodayMessage: string;

    afterDueDate: boolean;
    afterDays: number;
    overdueSubject: string;
    overdueMessage: string;

    signature: string;
  };

  @Prop({
    type: {
      invoiceUploaded: Boolean,
      reminderSent: Boolean,
      weeklySummary: Boolean,
    },
    default: {
      invoiceUploaded: true,
      reminderSent: true,
      weeklySummary: false,
    },
  })
  notifications?: {
    invoiceUploaded: boolean;
    reminderSent: boolean;
    weeklySummary: boolean;
  };

  @Prop({
    type: {
      usedStorage: Number,
      invoiceCount: Number,
    },
    default: {
      usedStorage: 0,
      invoiceCount: 0,
    },
  })
  storage?: {
    usedStorage: number;
    invoiceCount: number;
  };

  @Prop({
    default: 'Africa/Lagos',
  })
  timeZone?: string;

  @Prop({
    default: 'en',
  })
  language?: string;

  @Prop({
    default: 'DD/MM/YYYY',
  })
  dateFormat?: string;

  @Prop({
    default: 'NGN',
  })
  currency?: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
