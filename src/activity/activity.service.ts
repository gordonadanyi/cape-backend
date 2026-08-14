import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Activity,
  ActivityDocument,
  ActivityType,
} from '../schema/activity.schema';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name)
    private readonly activityModel: Model<ActivityDocument>,

    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Create a new activity
   */
  async create(data: {
    userId: string;
    type: ActivityType;
    title: string;
    description: string;
    invoiceId?: string;
    paymentReference?: string;
    metadata?: Record<string, any>;
  }) {
    const activity = await this.activityModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      description: data.description,
      invoiceId: data.invoiceId,
      paymentReference: data.paymentReference,
      metadata: data.metadata || {},
    });

    /**
     * Push the newly-created activity to the user's WebSocket room
     * (same room/connection the notification gateway already manages),
     * so the Activity tab updates live instead of only on refresh.
     */
    this.notificationGateway.emitToUser(data.userId, 'activity', activity);

    return activity;
  }

  /**
   * Get activities for a user
   */
  async findByUser(userId: string) {
    return this.activityModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get recent activities
   */
  async findRecent(userId: string, limit = 20) {
    return this.activityModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Delete an activity
   */
  async delete(activityId: string, userId: string) {
    return this.activityModel.findOneAndDelete({
      _id: activityId,
      userId,
    });
  }
}
