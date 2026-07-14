import { IsOptional, IsString } from 'class-validator';

export class UpdateEmailDto {
  @IsOptional()
  @IsString()
  defaultSubject?: string;

  @IsOptional()
  @IsString()
  defaultMessage?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}
