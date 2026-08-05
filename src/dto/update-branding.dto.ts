import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    example: 'Cape Studio',
    description: 'Company name shown on invoice branding.',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'https://cape.test',
    description: 'Company website URL.',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: '12 Marina Road, Lagos',
    description: 'Business address shown on invoices.',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;
}
