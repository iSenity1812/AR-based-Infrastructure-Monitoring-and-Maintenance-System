import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
};

function isMongoDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'MongoServerError' &&
    (error as { code?: unknown }).code === 11000
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ correlationId?: string }>();

    const correlationId = req.correlationId;

    if (isMongoDuplicateKeyError(exception)) {
      const body: ErrorEnvelope = {
        error: {
          code: 'CONFLICT',
          message: 'Duplicate key',
          correlationId,
        },
      };
      res.status(HttpStatus.CONFLICT).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      const message =
        typeof response === 'string'
          ? response
          : typeof response === 'object' &&
              response !== null &&
              'message' in response
            ? (response as { message?: string | string[] }).message
            : exception.message;

      const normalizedMessage = Array.isArray(message)
        ? message.join(', ')
        : message;
      const body: ErrorEnvelope = {
        error: {
          code: HttpStatus[status] ?? 'HTTP_ERROR',
          message: normalizedMessage ?? exception.message,
          details: typeof response === 'object' ? response : undefined,
          correlationId,
        },
      };

      res.status(status).json(body);
      return;
    }

    const body: ErrorEnvelope = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        correlationId,
      },
    };
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
