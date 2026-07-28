import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    void context;

    if (err || !user) {
      throw new UnauthorizedException(
        info?.message ?? 'Authentication is required.',
      );
    }

    return user;
  }
}
