import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { BaseUseCaseError } from '@use-cases/errors/use-case.errors';
import { serializeErrorEnvelope } from '../serializers/api-envelope.serializer';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

type ValidationResponseBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  errors?: unknown;
};

@Catch()
export class UseCaseHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => {
        json: (body: unknown) => void;
      };
    }>();
    const request = host.switchToHttp().getRequest<RequestLike>();

    const { statusCode, errorCode, message, details } =
      this.normalizeException(exception);

    response.status(statusCode).json(
      serializeErrorEnvelope(
        {
          code: errorCode,
          message,
          details,
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
    if (exception instanceof BaseUseCaseError) {
      return {
        statusCode: exception.statusCode,
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();
      const normalizedBody = this.normalizeHttpResponse(responseBody);

      return {
        statusCode,
        errorCode: this.mapStatusToErrorCode(statusCode),
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
    responseBody: string | ValidationResponseBody | object,
  ): {
    message: string;
    details: unknown;
  } {
    if (typeof responseBody === 'string') {
      return {
        message: responseBody,
        details: {},
      };
    }

    const body = responseBody as ValidationResponseBody;
    const message =
      typeof body.message === 'string'
        ? body.message
        : Array.isArray(body.message) && body.message.length > 0
          ? 'Validation failed.'
          : (body.error ?? 'Request failed.');

    return {
      message,
      details: {
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
      default:
        return statusCode >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : `HTTP_${statusCode}`;
    }
  }
}
