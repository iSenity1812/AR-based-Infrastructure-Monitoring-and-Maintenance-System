import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { CurrentAuthContextDto } from './current-auth-context.dto';
import type { PermissionCode } from './permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions =
      this.reflector.getAllAndOverride<PermissionCode[]>(
        REQUIRED_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentAuthContextDto }>();

    if (!request.user) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }

    const hasPermissions = permissions.every((permission) =>
      request.user!.permissions.includes(permission),
    );

    if (!hasPermissions) {
      throw new ForbiddenException('Missing required permissions.');
    }

    return true;
  }
}
