import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from 'src/schema/invoice.schema';
import { Settings, SettingsSchema } from 'src/schema/settings.schema';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from 'src/mailer/mailer.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
    MailerModule,
    NotificationModule,
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}