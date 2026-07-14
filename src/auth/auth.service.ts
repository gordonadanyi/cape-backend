import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChangePasswordDto } from 'src/dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async generateToken(user: User & { _id: Types.ObjectId }): Promise<string> {
    const payload = { email: user.email, sub: user._id.toString() };
    return this.jwtService.sign(payload);
  }

  async signup(createUserDto: CreateUserDto): Promise<any> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.userModel.create({
      businessname: createUserDto.businessname,
      email: createUserDto.email,
      password: passwordHash,
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const accesstoken = await this.generateToken(user);
    return {
      message: 'Login Successful',
      accesstoken,
    };
  }

  async changePassword(userId: Types.ObjectId, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new BadRequestException('InvalID USER');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Current password is not correct');
    }

    const hashPassword = await bcrypt.hash(dto.newPassword, 10);

    user.password = hashPassword;

    await user.save();

    return {
      message: "password changed successfully",
    };
  }
}
