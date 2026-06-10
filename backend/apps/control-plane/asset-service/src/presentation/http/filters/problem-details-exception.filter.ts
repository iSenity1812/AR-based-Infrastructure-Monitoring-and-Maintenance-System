import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

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
  originalUrl?: string;
  url?: string;
};

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<ResponseLike>();
    const request = http.getRequest<RequestLike>();
    const problem = toProblemDetails(exception, request);
    const status = problem.error.details?.status ?? 500;

    response.setHeader('Content-Type', 'application/json');
    response.status(status).json(problem);
  }
}
