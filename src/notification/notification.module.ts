import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import {
  Notification,
  NotificationSchema,
} from 'src/schema/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Notification.name,
        schema: NotificationSchema,
      },
    ]),
  ],

  providers: [NotificationService, NotificationGateway],

  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
