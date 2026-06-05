import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email used for sign-in.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Admin@123456',
    description: 'User password.',
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
