import { SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '../../../domain/constants/permission-code.constant';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (
  ...permissions: PermissionCode[]
): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
