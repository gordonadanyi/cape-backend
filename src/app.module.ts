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
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: Number(config.get<string>('REDIS_PORT')) || 6379,
        },
      }),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ limit: 4, ttl: 10 * 1000 }],
      errorMessage: 'Too many request',
    }),
    AuthModule,
    InvoiceModule,
    SettingsModule,
    MailerModule,
    PaymentModule,
  ],
  controllers: [AppController, MailerController],
  providers: [AppService, MailerService],
})
export class AppModule {}
