abstract class UseCaseError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode: string,
    readonly details: unknown = {},
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedUseCaseError extends UseCaseError {
  constructor(message: string, details: unknown = {}) {
    super(message, 401, 'UNAUTHENTICATED', details);
  }
}

export class ForbiddenUseCaseError extends UseCaseError {
  constructor(message: string, details: unknown = {}) {
    super(message, 403, 'PERMISSION_DENIED', details);
  }
}

export class ConflictUseCaseError extends UseCaseError {
  constructor(message: string, details: unknown = {}) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class NotFoundUseCaseError extends UseCaseError {
  constructor(message: string, details: unknown = {}) {
    super(message, 404, 'NOT_FOUND', details);
  }
}
