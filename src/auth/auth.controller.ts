import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import type { AuthRequest } from './auth-request';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto } from 'src/dto/change-password.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create a user account' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({
    description: 'Account created and access token returned.',
    schema: {
      example: {
        message: 'Signup Successful',
        accesstoken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Email already exists or body is invalid.',
  })
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful and access token returned.',
    schema: {
      example: {
        message: 'Login Successful',
        accesstoken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid email or password.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed successfully.',
    schema: {
      example: {
        message: 'password changed successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Current password is incorrect or body is invalid.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }
}
