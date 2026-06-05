import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { RoleCode } from '../../../domain/constants/role-code.enum';

export class CreateUserRequestDto {
  @ApiProperty({
    example: 'operator01',
  })
  @IsString()
  username!: string;

  @ApiProperty({
    example: 'operator01@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Operator@123',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: RoleCode,
    isArray: true,
    example: [RoleCode.SYSTEM_MONITORING_OPERATOR],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  roleCodes?: RoleCode[];
}
