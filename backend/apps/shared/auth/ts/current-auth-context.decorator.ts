import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { CurrentAuthContextDto } from './current-auth-context.dto';

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthContextDto =>
    context.switchToHttp().getRequest<{ user: CurrentAuthContextDto }>().user,
);
