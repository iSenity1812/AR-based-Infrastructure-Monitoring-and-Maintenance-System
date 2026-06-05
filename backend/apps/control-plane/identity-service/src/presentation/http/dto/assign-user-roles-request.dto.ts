import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

import { RoleCode } from '../../../domain/constants/role-code.enum';

export class AssignUserRolesRequestDto {
  @ApiProperty({
    enum: RoleCode,
    isArray: true,
    example: [RoleCode.MAINTENANCE_TECHNICIAN],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(RoleCode, { each: true })
  roleCodes!: RoleCode[];
}
