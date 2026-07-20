import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const { method, originalUrl, url } = req;
    const targetUrl = originalUrl ?? url;

    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : (correlationHeader ?? 'unknown');

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        const log = {
          correlationId,
          method,
          url: targetUrl,
          status: res.statusCode,
          durationMs: ms,
        };

        if (res.statusCode >= 400) {
          this.logger.warn(
            log,
            `${method} ${targetUrl} ${res.statusCode} - ${ms}ms`,
          );
        } else {
          this.logger.info(
            log,
            `${method} ${targetUrl} ${res.statusCode} - ${ms}ms`,
          );
        }
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - startedAt;

        let statusCode = 500;
        let stack: string | undefined;
        let detail: string | undefined;

        if (typeof err === 'object' && err !== null) {
          const maybeErr = err as Record<string, unknown>;

          if (typeof maybeErr.status === 'number') {
            statusCode = maybeErr.status;
          }

          if (typeof maybeErr.stack === 'string') {
            stack = maybeErr.stack;
          }

          if (typeof maybeErr.message === 'string') {
            detail = maybeErr.message;
          }
        }

        const log = {
          correlationId,
          method,
          url: targetUrl,
          status: statusCode,
          durationMs: duration,
          stack,
          detail,
        };

        this.logger.error(
          log,
          `[${correlationId}] ${method} ${targetUrl} ${statusCode} ${duration}ms`,
        );

        return throwError(() => err);
      }),
    );
  }
}
