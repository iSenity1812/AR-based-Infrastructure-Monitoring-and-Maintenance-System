import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type SuccessEnvelope<T> = {
  data: T;
  meta: {
    correlationId?: string;
    version: 'v1';
  };
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ correlationId?: string }>();
    const correlationId = req?.correlationId;

    return next.handle().pipe(
      map((data) => {
        const envelope: SuccessEnvelope<unknown> = {
          data,
          meta: {
            correlationId,
            version: 'v1',
          },
        };
        return envelope;
      }),
    );
  }
}
