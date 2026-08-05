import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Send a notification when an invoice is uploaded.',
  })
  @IsOptional()
  @IsBoolean()
  invoiceUploaded?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Send a notification when a reminder email is sent.',
  })
  @IsOptional()
  @IsBoolean()
  reminderSent?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Send a weekly invoice activity summary.',
  })
  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;
}
