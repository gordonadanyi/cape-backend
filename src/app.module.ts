import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { InvoiceModule } from './invoice/invoice.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { SettingsModule } from './settings/settings.module';
import { MailerService } from './mailer/mailer.service';
import { MailerController } from './mailer/mailer.controller';
import { MailerModule } from './mailer/mailer.module';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/cape-backend'),
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 4, ttl: 10 * 1000 }],
      errorMessage: 'Too many request',
    }),
    AuthModule,
    InvoiceModule,
    SettingsModule,
    MailerModule,
  ],
  controllers: [AppController, MailerController],
  providers: [AppService, MailerService],
})
export class AppModule {}
