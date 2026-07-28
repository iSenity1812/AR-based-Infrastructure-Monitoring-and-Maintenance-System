import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface ArRequestHeaders {
  authorization?: string;
  requestId?: string;
  correlationId?: string;
}

export const RequestHeaders = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ArRequestHeaders => {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    return {
      authorization: headerValue(request.headers.authorization),
      requestId: headerValue(request.headers['x-request-id']),
      correlationId: headerValue(request.headers['x-correlation-id']),
    };
  },
);

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
