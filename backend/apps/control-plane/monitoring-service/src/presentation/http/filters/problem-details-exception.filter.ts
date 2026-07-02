import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  ErrorDetails,
  ErrorResponse,
  ProblemDetailsResponse,
  ResponseMeta,
} from '@shared/response/ts/base-response.abstract';

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const status = this.resolveStatus(exception);
    const body = this.buildResponseBody(exception, request, status);
    const correlationId = this.getCorrelationId(request);
    const message = `[${correlationId}] ${request.method} ${request.originalUrl} ${status}`;

    this.logger.error(
      message,
      exception instanceof Error ? exception.stack : undefined,
      ProblemDetailsExceptionFilter.name,
    );

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private buildResponseBody(
    exception: unknown,
    request: Request,
    status: number,
  ): ProblemDetailsResponse {
    const meta = this.buildMeta(request);

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const reason = this.resolveReason(response, status);
      const detail = this.resolveDetail(response, status, exception);

      if (typeof response === 'string') {
        return this.problemDetails(meta, status, request, reason, response);
      }

      if (response && typeof response === 'object') {
        const payload = response as Record<string, unknown>;
        const error: ErrorResponse = {
          code: this.resolveErrorCode(status),
          message: reason,
          details: {
            status,
            type: asString(payload.type) ?? 'about:blank',
            instance: asString(payload.instance) ?? request.originalUrl,
            reason,
            detail,
            invalidParams: extractInvalidParams(payload),
          },
        };

        return {
          error,
          meta,
        };
      }
    }

    const reason = getDefaultTitle(status);

    return this.problemDetails(
      meta,
      status,
      request,
      reason,
      exception instanceof Error && exception.stack
        ? exception.stack
        : 'The request failed unexpectedly.',
    );
  }

  private problemDetails(
    meta: ResponseMeta,
    status: number,
    request: Request,
    reason: string,
    detail: string,
  ): ProblemDetailsResponse {
    return {
      error: {
        code: this.resolveErrorCode(status),
        message: reason,
        details: {
          status,
          type: 'about:blank',
          instance: request.originalUrl,
          reason,
          detail,
        },
      },
      meta,
    };
  }

  private buildMeta(request: Request): ResponseMeta {
    return {
      requestId: this.getRequestId(request),
      correlationId: this.getCorrelationId(request),
      version: 'v1',
      timestamp: new Date().toISOString(),
    };
  }

  private resolveReason(response: string | object, status: number): string {
    if (typeof response === 'string') {
      return getDefaultTitle(status);
    }

    const payload = response as Record<string, unknown>;

    return (
      asString(payload.title) ??
      asString(payload.error) ??
      asString(payload.message) ??
      getDefaultTitle(status)
    );
  }

  private resolveDetail(
    response: string | object,
    status: number,
    exception: HttpException,
  ): string {
    if (typeof response === 'string') {
      return response;
    }

    const payload = response as Record<string, unknown>;

    return (
      asString(payload.detail) ??
      extractHttpExceptionDetail(payload) ??
      exception.message ??
      getDefaultDetail(status)
    );
  }

  private resolveErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private getCorrelationId(request: Request): string {
    const correlationId = request.headers['x-correlation-id'];

    if (Array.isArray(correlationId)) {
      return correlationId[0] ?? 'unknown';
    }

    if (typeof correlationId === 'string') {
      return correlationId;
    }

    const requestId = request.headers['x-request-id'];

    if (Array.isArray(requestId)) {
      return requestId[0] ?? 'unknown';
    }

    if (typeof requestId === 'string') {
      return requestId;
    }

    return 'unknown';
  }

  private getRequestId(request: Request): string | undefined {
    const requestId = request.headers['x-request-id'];

    if (Array.isArray(requestId)) {
      return requestId[0];
    }

    if (typeof requestId === 'string') {
      return requestId;
    }

    return undefined;
  }
}

function extractHttpExceptionDetail(
  response: Record<string, unknown>,
): string | undefined {
  const message = response.message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    const items = message.filter((value): value is string => {
      return typeof value === 'string';
    });

    return items.length > 0 ? items.join(', ') : undefined;
  }

  return undefined;
}

function extractInvalidParams(
  response: Record<string, unknown>,
): ErrorDetails['invalidParams'] {
  const message = response.message;

  if (!Array.isArray(message)) {
    return undefined;
  }

  const invalidParams = message
    .filter((value): value is string => typeof value === 'string')
    .map((reason) => ({
      name: 'payload',
      reason,
    }));

  return invalidParams.length > 0 ? invalidParams : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getDefaultTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    default:
      return 'Internal Server Error';
  }
}

function getDefaultDetail(status: number): string {
  switch (status) {
    case 400:
      return 'The request payload is invalid.';
    case 401:
      return 'Authentication is required.';
    case 403:
      return 'The caller does not have enough permissions.';
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'The requested operation conflicts with current state.';
    default:
      return 'An unexpected error occurred.';
  }
}
