import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import * as authRequest from 'src/auth/auth-request';
import { UpdateProfileDto } from 'src/dto/update-profile.dto';
import { UpdateEmailDto } from 'src/dto/update-email.dto';
import { UpdateBrandingDto } from 'src/dto/update-branding.dto';
import { UpdateNotificationsDto } from 'src/dto/update-notifications.dto';
import { UpdatePreferencesDto } from 'src/dto/update-preference.dto';
import { UpdateRemindersDto } from 'src/dto/update-reminder.dto';
import { UpdateSecurityDto } from 'src/dto/update-security.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get or create settings for the authenticated user',
  })
  @ApiOkResponse({ description: 'Settings returned.' })
  getSettings(@Req() req: authRequest.AuthRequest) {
    return this.settingsService.getOrCreateSettings(
      new Types.ObjectId(req.user.userId),
    );
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update profile settings' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiOkResponse({ description: 'Profile settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
  updateProfile(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('branding')
  @ApiOperation({ summary: 'Update invoice branding settings' })
  @ApiBody({ type: UpdateBrandingDto })
  @ApiOkResponse({ description: 'Branding settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
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
  @ApiOperation({ summary: 'Update invoice email template settings' })
  @ApiBody({ type: UpdateEmailDto })
  @ApiOkResponse({ description: 'Email settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
  updateEmail(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.settingsService.updateEmail(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('reminders')
  @ApiOperation({ summary: 'Update reminder schedule and template settings' })
  @ApiBody({ type: UpdateRemindersDto })
  @ApiOkResponse({ description: 'Reminder settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
  updateReminders(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateRemindersDto,
  ) {
    return this.settingsService.updateReminders(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: UpdateNotificationsDto })
  @ApiOkResponse({ description: 'Notification settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
  updateNotifications(
    @Req() req: authRequest.AuthRequest,
    @Body() dto: UpdateNotificationsDto,
  ) {
    return this.settingsService.updateNotifications(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }

  @Patch('preferences')
  @ApiOperation({
    summary: 'Update locale, date, time zone, and currency preferences',
  })
  @ApiBody({ type: UpdatePreferencesDto })
  @ApiOkResponse({ description: 'Preferences updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
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
  @ApiOperation({ summary: 'Update security preferences' })
  @ApiBody({ type: UpdateSecurityDto })
  @ApiOkResponse({ description: 'Security settings updated.' })
  @ApiNotFoundResponse({ description: 'Settings not found.' })
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
