import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  invoiceUploaded?: boolean;

  @IsOptional()
  @IsBoolean()
  reminderSent?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;
}
