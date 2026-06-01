import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthUser } from '../auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Missing user context');

    const userPermissions = new Set(user.capabilityKeys);
    const allowed = requiredPermissions.every((required) =>
      userPermissions.has(required),
    );
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
