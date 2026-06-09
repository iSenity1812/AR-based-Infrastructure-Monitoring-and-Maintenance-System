import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const { method, url } = req;

    const startedAt = Date.now();
    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : (correlationHeader ?? 'unknown');

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        this.logger.log(`${method} ${url} ${res.statusCode} - ${ms}ms`);
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - startedAt;

        let statusCode = 500;
        let stack: string | undefined;

        if (typeof err === 'object' && err !== null) {
          const maybeErr = err as Record<string, unknown>;

          if (typeof maybeErr.status === 'number') {
            statusCode = maybeErr.status;
          }

          if (typeof maybeErr.stack === 'string') {
            stack = maybeErr.stack;
          }
        }

        this.logger.error(
          `[${correlationId}] ${req.method} ${req.originalUrl} ${statusCode} ${duration}ms`,
          stack,
        );

        return throwError(() => err);
      }),
    );
  }
}
