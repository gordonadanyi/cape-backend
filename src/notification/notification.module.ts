import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import {
  Notification,
  NotificationSchema,
} from 'src/schema/notification.schema';

@Module({
  imports: [
AuthModule,
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],

controllers: [

    NotificationController,

  ],



  providers: [NotificationService, NotificationGateway],

  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
