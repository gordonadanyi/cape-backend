import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;
}
