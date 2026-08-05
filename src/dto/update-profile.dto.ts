import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Gordon Cape',
    description: 'User full name.',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'owner@cape.test',
    description: 'Public contact email address.',
  })
  @IsOptional()
  @IsEmail()
  emailAddress?: string;

  @ApiPropertyOptional({
    example: 'Cape Studio',
    description: 'Company name displayed in the app.',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: '+234 801 234 5678',
    description: 'Public contact phone number.',
  })
  @IsOptional()
  @Matches(/^[+]?[0-9\s\-()]{7,20}$/)
  phoneNumber?: string;
}
