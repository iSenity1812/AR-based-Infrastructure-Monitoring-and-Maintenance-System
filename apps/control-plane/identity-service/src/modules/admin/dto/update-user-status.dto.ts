import { IsEnum } from 'class-validator';
import { UserStatus } from '../../users/user-status.enum';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}
