import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ValidationError,
} from '@nestjs/common';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';

import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import type {
  InvalidParamResponse,
  ProblemDetailsResponse,
  ResponseMeta,
} from '@shared/response/ts/base-response.abstract';
import { UseCaseError } from '@use-cases/errors/use-case.errors';

type RequestLike = {
  headers: Record<string, string | undefined>;
  originalUrl?: string;
  url?: string;
};

type HttpExceptionResponseBody = string | { message?: string | string[] };

export function createValidationProblem(errors: ValidationError[]) {
  return new ProblemDetailException(HttpStatus.BAD_REQUEST, {
    type: 'about:blank',
    title: 'Bad Request',
    detail: 'Request validation failed.',
    code: ErrorCode.SYS_VALIDATION_ERROR,
    invalidParams: flattenValidationErrors(errors),
  } as never);
}

export function toProblemDetails(
  exception: unknown,
  request: RequestLike,
): ProblemDetailsResponse {
  if (exception instanceof ProblemDetailException) {
    return normalizeProblemDetails(
      exception.getStatus(),
      exception.getResponse(),
      request,
    );
  }

  if (exception instanceof UseCaseError) {
    return buildErrorEnvelope(
      exception.statusCode,
      {
        code: exception.errorCode,
        message: getDefaultTitle(exception.statusCode),
        details: {
          status: exception.statusCode,
          type: 'about:blank',
          instance: request.originalUrl ?? request.url ?? '',
          reason: exception.message,
          detail: exception.message,
        },
      },
      request,
    );
  }

  if (exception instanceof HttpException) {
    return normalizeHttpException(exception, request);
  }

  return buildErrorEnvelope(
    HttpStatus.INTERNAL_SERVER_ERROR,
    {
      code: ErrorCode.INTERNAL,
      message: getDefaultTitle(HttpStatus.INTERNAL_SERVER_ERROR),
      details: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        type: 'about:blank',
        instance: request.originalUrl ?? request.url ?? '',
        reason: 'An unexpected error occurred.',
        detail: 'An unexpected error occurred.',
      },
    },
    request,
  );
}

function normalizeHttpException(
  exception: HttpException,
  request: RequestLike,
): ProblemDetailsResponse {
  const status = exception.getStatus();
  const response = exception.getResponse() as HttpExceptionResponseBody;

  if (
    exception instanceof BadRequestException &&
    hasValidationMessages(response)
  ) {
    return buildErrorEnvelope(
      status,
      {
        code: ErrorCode.SYS_VALIDATION_ERROR,
        message: getDefaultTitle(status),
        details: {
          status,
          type: 'about:blank',
          instance: request.originalUrl ?? request.url ?? '',
          reason: 'Request validation failed.',
          detail: 'Request validation failed.',
          invalidParams: response.message.map((message) => ({
            name: extractInvalidParamName(message),
            reason: message,
          })),
        },
      },
      request,
    );
  }

  const detail = extractHttpExceptionDetail(response, exception.message);
  return buildErrorEnvelope(
    status,
    {
      code: mapStatusToErrorCode(status),
      message: getDefaultTitle(status),
      details: {
        status,
        type: 'about:blank',
        instance: request.originalUrl ?? request.url ?? '',
        reason: detail,
        detail,
      },
    },
    request,
  );
}

function normalizeProblemDetails(
  status: number,
  problem: Record<string, unknown>,
  request: RequestLike,
): ProblemDetailsResponse {
  return buildErrorEnvelope(
    status,
    {
      code: asString(problem.code) ?? mapStatusToErrorCode(status),
      message: asString(problem.title) ?? getDefaultTitle(status),
      details: {
        status,
        type: asString(problem.type) ?? 'about:blank',
        instance: request.originalUrl ?? request.url ?? '',
        reason:
          asString(problem.detail) ??
          asString(problem.title) ??
          getDefaultDetail(status),
        detail: asString(problem.detail) ?? getDefaultDetail(status),
        invalidParams: asInvalidParams(problem.invalidParams),
      },
    },
    request,
  );
}

function buildErrorEnvelope(
  status: number,
  error: Pick<ProblemDetailsResponse['error'], 'code' | 'message' | 'details'>,
  request: RequestLike,
): ProblemDetailsResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: {
        status,
        instance: request.originalUrl ?? request.url ?? '',
        ...(error.details ?? {}),
      },
    },
    meta: buildMeta(request),
  };
}

function buildMeta(request: RequestLike): ResponseMeta {
  const requestId = request.headers['x-request-id'];
  const correlationId =
    request.headers['x-correlation-id'] ?? request.headers['x-request-id'];

  return {
    requestId,
    correlationId,
    version: 'v1',
    timestamp: new Date().toISOString(),
  };
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): InvalidParamResponse[] {
  return errors.flatMap((error) => {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      name: currentPath,
      reason: message,
    }));
    const childErrors = flattenValidationErrors(
      error.children ?? [],
      currentPath,
    );
    return [...ownErrors, ...childErrors];
  });
}

function hasValidationMessages(
  response: HttpExceptionResponseBody,
): response is { message: string[] } {
  return (
    typeof response === 'object' &&
    response !== null &&
    Array.isArray(response.message)
  );
}

function extractHttpExceptionDetail(
  response: HttpExceptionResponseBody,
  fallback: string,
): string {
  if (typeof response === 'string') {
    return response;
  }

  if (typeof response?.message === 'string') {
    return response.message;
  }

  return fallback;
}

function extractInvalidParamName(message: string): string {
  const [firstToken] = message.split(' ');
  return firstToken || 'request';
}

function getDefaultTitle(status: number): string {
  const titles: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
    [HttpStatus.FORBIDDEN]: 'Forbidden',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
  };

  return titles[status] ?? 'Internal Server Error';
}

function getDefaultDetail(status: number): string {
  const details: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'The request payload is invalid.',
    [HttpStatus.UNAUTHORIZED]: 'Authentication is required.',
    [HttpStatus.FORBIDDEN]: 'The caller does not have enough permissions.',
    [HttpStatus.NOT_FOUND]: 'The requested resource could not be found.',
    [HttpStatus.CONFLICT]:
      'The requested operation conflicts with current state.',
  };

  return details[status] ?? 'An unexpected error occurred.';
}

function mapStatusToErrorCode(status: number): ErrorCode {
  const codes: Record<number, ErrorCode> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_ARGUMENT,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
    [HttpStatus.FORBIDDEN]: ErrorCode.PERMISSION_DENIED,
    [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
    [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  };

  return codes[status] ?? ErrorCode.INTERNAL;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asInvalidParams(value: unknown): InvalidParamResponse[] | undefined {
  return Array.isArray(value) ? (value as InvalidParamResponse[]) : undefined;
}
