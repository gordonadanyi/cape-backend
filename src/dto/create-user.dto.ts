import { IsString, IsEmail, MinLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @MinLength(3, { message: 'Business name must be at least 3 characters long' })
  @IsString()
  businessname?: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail()
  email?: string;

  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsString()
  password?: string;
}
