import { HttpStatus } from '@nestjs/common';

export class BaseUseCaseError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
    public readonly details: unknown = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedUseCaseError extends BaseUseCaseError {
  constructor(message = 'Unauthorized.', details: unknown = {}) {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', details);
  }
}

export class ForbiddenUseCaseError extends BaseUseCaseError {
  constructor(message = 'Forbidden.', details: unknown = {}) {
    super(message, HttpStatus.FORBIDDEN, 'PERMISSION_DENIED', details);
  }
}

export class ConflictUseCaseError extends BaseUseCaseError {
  constructor(message = 'Conflict.', details: unknown = {}) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT', details);
  }
}

export class BadRequestUseCaseError extends BaseUseCaseError {
  constructor(message = 'Bad request.', details: unknown = {}) {
    super(message, HttpStatus.BAD_REQUEST, 'BAD_REQUEST', details);
  }
}

export class NotFoundUseCaseError extends BaseUseCaseError {
  constructor(message = 'Not found.', details: unknown = {}) {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND', details);
  }
}

export class ServiceUnavailableUseCaseError extends BaseUseCaseError {
  constructor(message = 'Service unavailable.', details: unknown = {}) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      'SERVICE_UNAVAILABLE',
      details,
    );
  }
}
