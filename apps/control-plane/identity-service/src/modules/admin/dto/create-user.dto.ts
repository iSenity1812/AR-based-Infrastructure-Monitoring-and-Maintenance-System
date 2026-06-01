import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../users/user-status.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  @IsString({ each: true })
  roleNames!: string[];

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
