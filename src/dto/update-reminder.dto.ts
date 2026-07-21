import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRemindersDto {
  @IsOptional()
  @IsBoolean()
  beforeDueDate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  beforeDays?: number;

  @IsOptional()
  @IsBoolean()
  onDueDate?: boolean;

  @IsOptional()
  @IsBoolean()
  afterDueDate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  afterDays?: number;

  @IsOptional()
  @IsString()
  beforeSubject?: string;

  @IsOptional()
  @IsString()
  beforeMessage?: string;

  @IsOptional()
  @IsString()
  dueTodaySubject?: string;

  @IsOptional()
  @IsString()
  dueTodayMessage?: string;

  @IsOptional()
  @IsString()
  overdueSubject?: string;

  @IsOptional()
  @IsString()
  overdueMessage?: string;

  @IsOptional()
  @IsString()
  signature?: string;
}
