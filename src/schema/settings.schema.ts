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
      defaultSubject: 'Invoice Reminder',
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
      onDueDate: Boolean,
      afterDueDate: Boolean,
      afterDays: Number,
    },
    default: {
      beforeDueDate: true,
      beforeDays: 3,
      onDueDate: true,
      afterDueDate: true,
      afterDays: 3,
    },
  })
  reminders?: {
    beforeDueDate: boolean;
    beforeDays: number;
    onDueDate: boolean;
    afterDueDate: boolean;
    afterDays: number;
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
