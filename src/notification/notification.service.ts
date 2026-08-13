import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../schema/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a new notification
   */
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    invoiceId?: string;
    paymentReference?: string;
    metadata?: Record<string, any>;
  }) {
    const notification = await this.notificationModel.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      invoiceId: data.invoiceId,
      paymentReference: data.paymentReference,
      metadata: data.metadata || {},
      isRead: false,
    });

    return notification;
  }

  /**
   * Get all notifications for a user
   */
  async findByUser(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get unread notifications
   */
  async findUnread(userId: string) {
    return this.notificationModel
      .find({
        userId,
        isRead: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({
      userId,
      isRead: false,
    });
  }

  /**
   * Mark one notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        userId,
      },
      {
        $set: {
          isRead: true,
        },
      },
      {
        new: true,
      },
    );
  }

  /**
   * Mark every notification as read
   */
  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      {
        userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    return {
      success: true,
      message: 'All notifications marked as read.',
    };
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string) {
    return this.notificationModel.findOneAndDelete({
      _id: notificationId,
      userId,
    });
  }
}
