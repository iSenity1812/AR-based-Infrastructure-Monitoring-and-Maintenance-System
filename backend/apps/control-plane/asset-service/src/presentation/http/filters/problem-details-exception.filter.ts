import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';

import type { ProblemDetailsResponse } from '@shared/response/ts/base-response.abstract';
import { toProblemDetails } from '@presentation/http/problem-details/problem-details.util';

type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: ProblemDetailsResponse) => void;
  };
};

type RequestLike = {
  headers: Record<string, string | undefined>;
  method?: string;
  originalUrl?: string;
  url?: string;
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<ResponseLike>();
    const request = http.getRequest<RequestLike>();
    const problem = toProblemDetails(exception, request);
    const status = problem.error.details?.status ?? 500;
    const correlationId =
      request.headers['x-correlation-id'] ?? request.headers['x-request-id'];

    this.logger.error(
      {
        correlationId,
        method: request['method'],
        url: request.originalUrl ?? request.url ?? '',
        status,
        reason: problem.error.details?.reason,
        detail: problem.error.details?.detail,
        exception:
          exception instanceof Error
            ? {
                name: exception.name,
                message: exception.message,
                stack: exception.stack,
              }
            : exception,
      },
      `[${correlationId ?? 'unknown'}] ${request['method']} ${request.originalUrl ?? request.url ?? ''} ${status}`,
    );

    response.setHeader('Content-Type', 'application/json');
    response.status(status).json(problem);
  }
}
