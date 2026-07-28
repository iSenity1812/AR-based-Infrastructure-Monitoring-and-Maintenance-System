import type { PermissionCode } from '@domain/constants/permission-code.constant';

export interface CurrentAuthContextDto {
  userId: string;
  username: string;
  fullName?: string;
  sessionId: string;
  roles: string[];
  permissions: PermissionCode[];
  mustChangePassword?: boolean;
}
