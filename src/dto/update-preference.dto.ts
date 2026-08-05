import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred language code.',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 'Africa/Lagos',
    description: 'Preferred IANA time zone.',
  })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional({
    example: 'DD/MM/YYYY',
    description: 'Preferred date display format.',
  })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Preferred ISO currency code.',
  })
  @IsOptional()
  @IsString()
  currency?: string;
}
