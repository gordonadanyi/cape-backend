import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Notification,
  NotificationSchema,
} from '../schema/notification.schema';

import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],

  controllers: [NotificationController],

  providers: [NotificationService, NotificationGateway],

  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
