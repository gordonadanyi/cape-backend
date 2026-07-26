import { Body, Controller, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Types } from 'mongoose';
import { ChangePasswordDto } from 'src/dto/change-password.dto';
import type { AuthRequest } from './auth-request';
import { ApiTags, ApiResponse, ApiOkResponse, ApiOperation, ApiCreatedResponse, ApiBadRequestResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    // Implement signup logic here
    return this.authService.signup(createUserDto);
  }

  @Post('login')
  login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      new Types.ObjectId(req.user.userId),
      dto,
    );
  }
}
