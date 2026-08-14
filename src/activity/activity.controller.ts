import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ActivityService } from './activity.service';

@Controller('activities')
@UseGuards(AuthGuard('jwt'))
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get all activities
   *
   * GET /activities
   */
  @Get()
  async getActivities(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    return this.activityService.findByUser(userId);
  }

  /**
   * Get recent activities
   *
   * GET /activities/recent
   */
  @Get('recent')
  async getRecentActivities(@Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    return this.activityService.findRecent(userId, 20);
  }

  /**
   * Delete activity
   *
   * DELETE /activities/:id
   */
  @Delete(':id')
  async deleteActivity(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub || req.user?.userId || req.user?.id;

    return this.activityService.delete(id, userId);
  }
}
