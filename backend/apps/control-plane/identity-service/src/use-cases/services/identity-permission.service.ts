import type { PermissionCode } from '../../domain/constants/permission-code.constant';
import { IdentityRole } from '../../domain/entities/identity-role.entity';

export class IdentityPermissionService {
  resolvePermissions(roles: IdentityRole[]): PermissionCode[] {
    const permissions = new Set<PermissionCode>();

    roles.forEach((role) => {
      role.permissionCodes.forEach((permission) => permissions.add(permission));
    });

    return Array.from(permissions);
  }
}
