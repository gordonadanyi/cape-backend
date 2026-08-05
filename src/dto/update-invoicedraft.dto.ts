import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/**
 * Fields a user is allowed to edit from the invoice draft/review screen.
 * Deliberately excludes userId, status, file, isSent, extractionWarnings,
 * etc. - those are server-controlled and should never come from the client.
 */
export class UpdateInvoiceDraftDto {
  @ApiPropertyOptional({
    example: 'INV-001',
    description: 'Customer-facing invoice number.',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    example: 'Ada Lovelace',
    description: 'Name of the customer receiving the invoice.',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: 'ada@example.com',
    description: 'Email address where the invoice will be sent.',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    example: 150000,
    minimum: 0,
    description: 'Amount due on the invoice.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountDue?: number;

  @ApiPropertyOptional({
    example: '2026-08-15',
    description: 'Invoice due date in ISO date format.',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    example: 'Includes July consulting work.',
    description: 'Internal or customer-facing invoice note.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'Invoice INV-001 from Cape Studio',
    description: 'Email subject line used when sending the invoice.',
  })
  @IsOptional()
  @IsString()
  subjectLine?: string;

  @ApiPropertyOptional({
    example: 'Hi Ada, please find your invoice attached.',
    description: 'Email message used when sending the invoice.',
  })
  @IsOptional()
  @IsString()
  personalMessage?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T10:30:00.000Z',
    description: 'Optional scheduled send time in ISO date-time format.',
  })
  @IsOptional()
  @IsDateString()
  sendAt?: string;

  @ApiPropertyOptional({
    example: 'Africa/Lagos',
    description: 'Time zone used to schedule or display the send time.',
  })
  @IsOptional()
  @IsString()
  timeZone?: string;
}
