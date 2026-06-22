import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';

import { ErrorCode } from '@shared/errors/ts/error-code.enum';

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
      throw new ProblemDetailException(401, {
        type: 'about:blank',
        title: 'Unauthorized',
        detail: info?.message ?? 'Authentication is required.',
        code: ErrorCode.UNAUTHENTICATED,
      });
    }

    return user;
  }
}
