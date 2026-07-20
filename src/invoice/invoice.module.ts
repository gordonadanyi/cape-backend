import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceSchema } from '../schema/invoice.schema';
import { InvoiceSchedulerService } from './invoice-scheduler.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { InvoiceReminderService } from './invoice-reminder.service';
import { Settings, SettingsSchema } from 'src/schema/settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
    MailerModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceSchedulerService, InvoiceReminderService],
})
export class InvoiceModule {}
