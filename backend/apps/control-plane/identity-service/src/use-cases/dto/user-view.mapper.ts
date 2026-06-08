import type { PermissionCode } from '../../domain/constants/permission-code.constant';
import { IdentityUser } from '../../domain/entities/identity-user.entity';
import { AdminUserDto } from './admin-user.dto';
import { AuthenticatedUserDto } from './authenticated-user.dto';

export function toAdminUserDto(user: IdentityUser): AdminUserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    jobTitle: user.jobTitle,
    department: user.department,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roleCodes: user.roleCodes,
    mustChangePassword: user.mustChangePassword,
    passwordChangedAt: user.passwordChangedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toAuthenticatedUserDto(
  user: IdentityUser,
  permissions: PermissionCode[],
): AuthenticatedUserDto {
  return {
    ...toAdminUserDto(user),
    permissions,
  };
}
