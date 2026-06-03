import type { PermissionCode } from '../../domain/constants/permission-code.constant';
import { RoleCode } from '../../domain/constants/role-code.enum';
import { UserStatus } from '../../domain/constants/user-status.enum';

export interface AuthenticatedUserDto {
  id: string;
  username: string;
  email: string;
  status: UserStatus;
  roleCodes: RoleCode[];
  permissions: PermissionCode[];
}
