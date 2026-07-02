import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';
import { Reflector } from '@nestjs/core';

import type { CurrentAuthContextDto } from '../../../../application/use-cases/dto/current-auth-context.dto';
import type { PermissionCode } from '../constants/permission-code.constant';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

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
      throw new ProblemDetailException(403, {
        type: 'about:blank',
        title: 'Forbidden',
        detail: 'Authenticated user context is missing.',
        code: ErrorCode.PERMISSION_DENIED,
      });
    }

    const hasPermissions = permissions.every((permission) =>
      request.user!.permissions.includes(permission),
    );

    if (!hasPermissions) {
      throw new ProblemDetailException(403, {
        type: 'about:blank',
        title: 'Forbidden',
        detail: 'Missing required permissions.',
        code: ErrorCode.PERMISSION_DENIED,
      });
    }

    return true;
  }
}
