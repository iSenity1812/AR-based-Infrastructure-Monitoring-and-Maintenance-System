export class UnauthorizedUseCaseError extends Error {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHENTICATED';
}

export class ForbiddenUseCaseError extends Error {
  readonly statusCode = 403;
  readonly errorCode = 'PERMISSION_DENIED';
}

export class ConflictUseCaseError extends Error {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

export class NotFoundUseCaseError extends Error {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}
