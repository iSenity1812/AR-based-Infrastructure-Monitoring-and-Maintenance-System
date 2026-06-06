export abstract class BaseResponse<T> {
  data!: T;
  meta?: Record<string, any>;
  requestId?: string;
}

export interface InvalidParamResponse {
  name: string;
  reason: string;
}

export interface ProblemDetailsResponse {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  timestamp: string;
  requestId?: string;
  invalidParams?: InvalidParamResponse[];
}
