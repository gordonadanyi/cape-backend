import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Cape Studio',
    minLength: 3,
    description: 'Business name for the account.',
  })
  @MinLength(3, { message: 'Business name must be at least 3 characters long' })
  @IsString()
  businessname?: string;

  @ApiProperty({
    example: 'owner@cape.test',
    description: 'Unique email address for the account.',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'password123',
    minLength: 6,
    description: 'Account password.',
  })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsString()
  password?: string;
}
