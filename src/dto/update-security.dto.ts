import {
  IsBoolean,
  IsOptional,
} from "class-validator";

export class UpdateSecurityDto {
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;
}