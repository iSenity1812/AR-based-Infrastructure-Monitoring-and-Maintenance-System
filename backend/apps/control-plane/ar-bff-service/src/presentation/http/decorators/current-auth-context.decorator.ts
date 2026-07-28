import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';

export const CurrentAuthContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthContextDto => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: CurrentAuthContextDto }>();

    return request.user;
  },
);
