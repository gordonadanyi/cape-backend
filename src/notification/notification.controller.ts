import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Get all notifications
   *
   * GET /notifications
   */
  @Get()
  async getNotifications(@Req() req: any) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    return this.notificationService.findByUser(userId);
  }

  /**
   * Get unread notifications
   *
   * GET /notifications/unread
   */
  @Get('unread')
  async getUnread(@Req() req: any) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    return this.notificationService.findUnread(userId);
  }

  /**
   * Get unread notification count
   *
   * GET /notifications/unread/count
   */
  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    const count =
      await this.notificationService.getUnreadCount(userId);

    return {
      count,
    };
  }

  /**
   * Mark one notification as read
   *
   * PATCH /notifications/:id/read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    return this.notificationService.markAsRead(
      id,
      userId,
    );
  }

  /**
   * Mark all notifications as read
   *
   * PATCH /notifications/read-all
   */
  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    return this.notificationService.markAllAsRead(
      userId,
    );
  }

  /**
   * Delete notification
   *
   * DELETE /notifications/:id
   */
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId =
      req.user?.sub ||
      req.user?.userId ||
      req.user?.id;

    return this.notificationService.delete(
      id,
      userId,
    );
  }
}