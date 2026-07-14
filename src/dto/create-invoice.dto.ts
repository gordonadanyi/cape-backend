import {
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  customerName?: string;

  @IsEmail()
  customerEmail?: string;

  @IsNumber()
  @Min(0)
  amount?: number;

  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
