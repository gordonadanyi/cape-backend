import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRemindersDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  beforeDueDate?: boolean;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  beforeDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onDueDate?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  afterDueDate?: boolean;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  afterDays?: number;

  @ApiPropertyOptional({ example: 'Invoice Reminder' })
  @IsOptional()
  @IsString()
  beforeSubject?: string;

  @ApiPropertyOptional({
    example: 'Your invoice is due in {{days}} day(s).',
  })
  @IsOptional()
  @IsString()
  beforeMessage?: string;

  @ApiPropertyOptional({ example: 'Invoice Due Today' })
  @IsOptional()
  @IsString()
  dueTodaySubject?: string;

  @ApiPropertyOptional({ example: 'Your invoice is due today.' })
  @IsOptional()
  @IsString()
  dueTodayMessage?: string;

  @ApiPropertyOptional({ example: 'Invoice Overdue' })
  @IsOptional()
  @IsString()
  overdueSubject?: string;

  @ApiPropertyOptional({ example: 'Your invoice is overdue.' })
  @IsOptional()
  @IsString()
  overdueMessage?: string;

  @ApiPropertyOptional({ example: 'Best regards, {{companyName}}' })
  @IsOptional()
  @IsString()
  signature?: string;
}
