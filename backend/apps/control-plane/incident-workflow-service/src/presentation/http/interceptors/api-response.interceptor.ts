import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';

import { SKIP_API_ENVELOPE_KEY } from '../decorators/skip-api-envelope.decorator';
import { serializeEnvelope } from '../serializers/api-envelope.serializer';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipEnvelope =
      this.reflector?.getAllAndOverride<boolean>(SKIP_API_ENVELOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (skipEnvelope) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestLike>();

    return next.handle().pipe(map((data) => serializeEnvelope(data, request)));
  }
}
