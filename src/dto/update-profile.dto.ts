import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  emailAddress?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @Matches(/^[+]?[0-9\s\-()]{7,20}$/)
  phoneNumber?: string;
}
