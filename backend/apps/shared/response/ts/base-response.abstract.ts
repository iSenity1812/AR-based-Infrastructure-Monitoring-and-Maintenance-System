export abstract class BaseResponse<T> {
  data!: T;
  meta!: ResponseMeta;
}

export interface InvalidParamResponse {
  name: string;
  reason: string;
}

export interface ResponseMeta {
  requestId?: string;
  correlationId?: string;
  version: 'v1';
  timestamp: string;
}

export interface ErrorDetails {
  status?: number;
  type?: string;
  instance?: string;
  reason?: string;
  detail?: string;
  invalidParams?: InvalidParamResponse[];
  [key: string]: unknown;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: ErrorDetails;
}

export interface ProblemDetailsResponse {
  error: ErrorResponse;
  meta: ResponseMeta;
}
