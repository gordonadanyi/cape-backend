import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

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
}
