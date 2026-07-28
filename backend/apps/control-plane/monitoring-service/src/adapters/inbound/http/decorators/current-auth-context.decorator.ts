import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentAuthContextDto } from '../../../../application/use-cases/dto/current-auth-context.dto';

export const CurrentAuthContext = createParamDecorator(
  (
    _: unknown,
    context: ExecutionContext,
  ): CurrentAuthContextDto | undefined => {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: CurrentAuthContextDto }>();
    return request.user;
  },
);
