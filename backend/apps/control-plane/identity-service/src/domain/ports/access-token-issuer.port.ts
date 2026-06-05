import type { PermissionCode } from '../constants/permission-code.constant';
import { RoleCode } from '../constants/role-code.enum';

export interface AccessTokenPayload {
  userId: string;
  username: string;
  sessionId: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
}

export interface AccessTokenIssuerPort {
  issue(payload: AccessTokenPayload): Promise<string>;
}
