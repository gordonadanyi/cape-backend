import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from '../schema/invoice.schema';
import { InvoiceSchedulerService } from './invoice-scheduler.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { InvoiceReminderService } from './invoice-reminder.service';
import { Settings, SettingsSchema } from 'src/schema/settings.schema';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceSendingProcessor } from './invoice-sending.processor';
import { INVOICE_SENDING_QUEUE } from 'src/types/invoice-send-job.types';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: INVOICE_SENDING_QUEUE,
    }),
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
    MailerModule,
    PaymentModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceSchedulerService,
    InvoiceReminderService,
    InvoiceSendingProcessor,
  ],
})
export class InvoiceModule {}
