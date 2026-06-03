import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { UserStatus } from '../../../domain/constants/user-status.enum';

export class UpdateUserStatusRequestDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.LOCKED,
  })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
