import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateInvoiceStatusDto {
  @ApiPropertyOptional({
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    example: 'paid',
    description: 'New invoice status.',
  })
  @IsEnum(['pending', 'paid', 'overdue', 'cancelled'])
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';

  @ApiPropertyOptional({
    example: 'Marked paid after bank transfer confirmation.',
    description: 'Optional note saved as the invoice description.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
