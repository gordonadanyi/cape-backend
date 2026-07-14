import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateInvoiceStatusDto {
  @IsEnum(['pending', 'paid', 'overdue', 'cancelled'])
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';

  @IsOptional()
  @IsString()
  description?: string;
}
