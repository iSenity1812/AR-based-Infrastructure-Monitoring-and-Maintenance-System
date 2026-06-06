import type { PermissionCode } from './permission-code.constant';

export interface CurrentAuthContextDto {
  userId: string;
  username: string;
  sessionId: string;
  roles: string[];
  permissions: PermissionCode[];
}
