import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

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
    example: 'Nguyen Van A',
  })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({
    example: '+84901234567',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'Maintenance Technician',
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({
    example: 'Operations',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatars/operator01.png',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

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
