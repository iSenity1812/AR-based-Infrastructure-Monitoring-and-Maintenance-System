import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthContextDto =>
    context.switchToHttp().getRequest<{ user: CurrentAuthContextDto }>().user,
);
