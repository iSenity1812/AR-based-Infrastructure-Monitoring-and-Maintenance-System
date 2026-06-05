import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';

import {
  ConflictUseCaseError,
  ForbiddenUseCaseError,
  NotFoundUseCaseError,
  UnauthorizedUseCaseError,
} from '../../../use-cases/errors/use-case.errors';

@Catch(
  UnauthorizedUseCaseError,
  ForbiddenUseCaseError,
  ConflictUseCaseError,
  NotFoundUseCaseError,
)
export class UseCaseHttpExceptionFilter implements ExceptionFilter {
  catch(
    exception:
      | UnauthorizedUseCaseError
      | ForbiddenUseCaseError
      | ConflictUseCaseError
      | NotFoundUseCaseError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => {
        json: (body: unknown) => void;
      };
    }>();

    const statusCode =
      'statusCode' in exception
        ? exception.statusCode
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorCode =
      'errorCode' in exception ? exception.errorCode : 'INTERNAL';

    response.status(statusCode).json({
      error: {
        code: errorCode,
        message: exception.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
