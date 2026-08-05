import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateEmailDto {
  @ApiPropertyOptional({
    example: 'Payment Invoice',
    description: 'Default subject used for invoice emails.',
  })
  @IsOptional()
  @IsString()
  defaultSubject?: string;

  @ApiPropertyOptional({
    example: 'Hello {{customerName}}, please find your invoice attached.',
    description: 'Default body used for invoice emails.',
  })
  @IsOptional()
  @IsString()
  defaultMessage?: string;

  @ApiPropertyOptional({
    example: 'Best regards, {{companyName}}',
    description: 'Email signature appended to invoice emails.',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
