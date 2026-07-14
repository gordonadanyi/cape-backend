import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdateProfileDto } from 'src/dto/update-profile.dto';
import { UpdateEmailDto } from 'src/dto/update-email.dto';
import { UpdateBrandingDto } from 'src/dto/update-branding.dto';
import { Types } from 'mongoose';
import * as authRequest from 'src/auth/auth-request';
import { UpdateNotificationsDto } from 'src/dto/update-notifications.dto';
import { UpdatePreferencesDto } from 'src/dto/update-preference.dto';
import { UpdateRemindersDto } from 'src/dto/update-reminder.dto';
import { UpdateSecurityDto } from 'src/dto/update-security.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get() // return users settings
  getSettings(@Req() req: authRequest.AuthRequest) {
    // const user = req.user as { userId: string };
    return this.settingsService.getOrCreateSettings(
      new Types.ObjectId(req.user.userId),
    );
  }

  // @Post("create")// create default settings

  @Patch('profile') // update settings
  updateProfile(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('branding') // update branding
  updateBranding(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.settingsService.updateBranding(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('email')
  updateEmail(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.settingsService.updateEmail(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('reminders') // update email reminders
  updateReminders(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateRemindersDto,
  ) {
    return this.settingsService.updateReminders(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('notifications') // update notifications
  updateNotifications(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.settingsService.updateNotifications(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  // @Patch("security") // update security
  // updateSecurity()

  @Patch('preferences')
  updatePreferences(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.settingsService.updatePreferences(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('security')
  updateSecurity(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateSecurityDto,
  ) {
    return this.settingsService.updateSecurity(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }
}
