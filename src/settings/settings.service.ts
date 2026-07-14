import { Injectable, NotFoundException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Settings, SettingsDocument } from 'src/schema/settings.schema';
import { UpdateBrandingDto } from 'src/dto/update-branding.dto';
import { UpdateRemindersDto } from 'src/dto/update-reminder.dto';
import { UpdateSecurityDto } from 'src/dto/update-security.dto';
import { UpdateProfileDto } from 'src/dto/update-profile.dto';
import { UpdateEmailDto } from 'src/dto/update-email.dto';
import { UpdateNotificationsDto } from 'src/dto/update-notifications.dto';
import { UpdatePreferencesDto } from 'src/dto/update-preference.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<SettingsDocument>,
  ) {}

  async getOrCreateSettings(userId: Types.ObjectId) {
    let settings = await this.settingsModel.findOne({ userId }).lean();
    if (!settings) {
      settings = await this.settingsModel.create({
        userId,
      });
    }
    return settings;
  }

  async updateProfile(userId: Types.ObjectId, profile: UpdateProfileDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          profile,
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateBranding(userId: Types.ObjectId, branding: UpdateBrandingDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          branding,
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateEmail(userId: Types.ObjectId, email: UpdateEmailDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          email,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateReminders(userId: Types.ObjectId, reminders: UpdateRemindersDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          reminders,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateNotifications(
    userId: Types.ObjectId,
    notifications: UpdateNotificationsDto,
  ) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          notifications,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updateSecurity(userId: Types.ObjectId, security: UpdateSecurityDto) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          security,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async updatePreferences(
    userId: Types.ObjectId,
    preferences: UpdatePreferencesDto,
  ) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $set: preferences,
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async incrementStorage(userId: Types.ObjectId, fileSize: number) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $inc: {
          'storage.usedStorage': fileSize,
          'storage.invoiceCount': 1,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  async decrementStorage(userId: Types.ObjectId, fileSize: number) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { userId },
      {
        $inc: {
          'storage.usedStorage': -fileSize,
          'storage.invoiceCount': -1,
        },
      },
      { new: true },
    );
    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

}
