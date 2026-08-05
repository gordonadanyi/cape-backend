import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateSecurityDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Enable or disable two-factor authentication preference.',
  })
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}
