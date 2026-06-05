import type { PermissionCode } from '../../domain/constants/permission-code.constant';
import { RoleCode } from '../../domain/constants/role-code.enum';

export interface CurrentAuthContextDto {
  userId: string;
  username: string;
  sessionId: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
}
