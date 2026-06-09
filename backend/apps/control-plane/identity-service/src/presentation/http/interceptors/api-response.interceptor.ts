import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

import {
  serializeEnvelope,
} from '../serializers/api-envelope.serializer';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLike>();

    return next.handle().pipe(
      map((data) => serializeEnvelope(data, request)),
    );
  }
}
