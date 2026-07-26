import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from '../schema/invoice.schema';
import { MailerModule } from 'src/mailer/mailer.module';
import { InvoiceReminderService } from './invoice-reminder.service';
import { Settings, SettingsSchema } from 'src/schema/settings.schema';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceSendingProcessor } from './invoice-sending.processor';
import { INVOICE_SENDING_QUEUE } from 'src/types/invoice-send-job.types';
import { PaymentModule } from 'src/payment/payment.module';
import { InvoiceController } from './invoice.controller';

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
    // InvoiceSchedulerService retired — BullMQ (InvoiceSendingProcessor)
    // is now the single system responsible for sending scheduled
    // invoices. Having both active meant they raced to process the same
    // due invoices; whichever won didn't necessarily include the
    // payment-link generation step, since only the BullMQ path had it.
    InvoiceReminderService,
    InvoiceSendingProcessor,
  ],
})
export class InvoiceModule {}
