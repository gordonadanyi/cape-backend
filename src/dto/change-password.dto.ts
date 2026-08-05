import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'password123',
    description: 'Current account password.',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    minLength: 8,
    description: 'New account password.',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
