import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { serializeErrorEnvelope } from '../serializers/api-envelope.serializer';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

type HttpResponseBody = {
  code?: string;
  message?: string | string[];
  error?: string;
  details?: unknown;
  statusCode?: number;
  errors?: unknown;
};

@Catch()
export class HttpExceptionEnvelopeFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<ResponseLike>();
    const request = http.getRequest<RequestLike>();
    const normalized = this.normalizeException(exception);

    response.status(normalized.statusCode).json(
      serializeErrorEnvelope(
        {
          code: normalized.errorCode,
          message: normalized.message,
          details: normalized.details,
        },
        request,
      ),
    );
  }

  private normalizeException(exception: unknown): {
    statusCode: number;
    errorCode: string;
    message: string;
    details: unknown;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const normalizedBody = this.normalizeHttpResponse(responseBody);

      return {
        statusCode,
        errorCode: normalizedBody.code ?? this.mapStatusToErrorCode(statusCode),
        message: normalizedBody.message,
        details: normalizedBody.details,
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: exception.message || 'Internal server error.',
        details: {},
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error.',
      details: {},
    };
  }

  private normalizeHttpResponse(
    responseBody: string | HttpResponseBody | object,
  ): {
    code?: string;
    message: string;
    details: unknown;
  } {
    if (typeof responseBody === 'string') {
      return {
        message: responseBody,
        details: {},
      };
    }

    const body = responseBody as HttpResponseBody;
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message) && body.message.length > 0
          ? 'Validation failed.'
          : (body.error ?? 'Request failed.');

    return {
      code: body.code,
      message,
      details: body.details ?? {
        statusCode: body.statusCode,
        error: body.error,
        message: body.message,
        validationErrors: body.errors,
      },
    };
  }

  private mapStatusToErrorCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_FAILED';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHENTICATED';
      case HttpStatus.FORBIDDEN:
        return 'PERMISSION_DENIED';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.GONE:
        return 'GONE';
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return statusCode >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : `HTTP_${statusCode}`;
    }
  }
}
