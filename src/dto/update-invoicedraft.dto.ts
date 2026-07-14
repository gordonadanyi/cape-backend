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
 * etc. — those are server-controlled and should never come from the client.
 */
export class UpdateInvoiceDraftDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountDue?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  subjectLine?: string;

  @IsOptional()
  @IsString()
  personalMessage?: string;

  @IsOptional()
  @IsDateString()
  sendAt?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;
}