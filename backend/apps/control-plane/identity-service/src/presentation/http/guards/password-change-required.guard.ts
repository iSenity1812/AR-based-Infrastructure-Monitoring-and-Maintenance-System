import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { CurrentAuthContextDto } from '../../../use-cases/dto/current-auth-context.dto';

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: CurrentAuthContextDto }>();
    const user = request.user;

    if (!user?.mustChangePassword) {
      return true;
    }

    throw new ForbiddenException(
      'Password change is required before accessing this resource.',
    );
  }
}
