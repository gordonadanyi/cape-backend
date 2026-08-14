import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Activity, ActivitySchema } from '../schema/activity.schema';

import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Activity.name,
        schema: ActivitySchema,
      },
    ]),
    NotificationModule,
  ],

  controllers: [ActivityController],

  providers: [ActivityService],

  exports: [ActivityService],
})
export class ActivityModule {}
