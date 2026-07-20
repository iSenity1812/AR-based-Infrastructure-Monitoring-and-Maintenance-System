import { ErrorCode } from '@shared/errors/ts/error-code.enum';

export abstract class UseCaseError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode: ErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedUseCaseError extends UseCaseError {
  constructor(message = 'Authentication is required.') {
    super(message, 401, ErrorCode.UNAUTHENTICATED);
  }
}

export class ForbiddenUseCaseError extends UseCaseError {
  constructor(message = 'The caller does not have enough permissions.') {
    super(message, 403, ErrorCode.PERMISSION_DENIED);
  }
}

export class ConflictUseCaseError extends UseCaseError {
  constructor(
    message = 'The requested operation conflicts with current state.',
  ) {
    super(message, 409, ErrorCode.CONFLICT);
  }
}

export class NotFoundUseCaseError extends UseCaseError {
  constructor(
    message = 'The requested resource could not be found.',
    errorCode = ErrorCode.NOT_FOUND,
  ) {
    super(message, 404, errorCode);
  }
}

export class BadRequestUseCaseError extends UseCaseError {
  constructor(
    message = 'The request payload is invalid.',
    errorCode = ErrorCode.INVALID_ARGUMENT,
  ) {
    super(message, 400, errorCode);
  }
}
