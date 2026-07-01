import type {
  BaseResponse,
  ResponseMeta,
} from '@shared/response/ts/base-response.abstract';

export type ApiEnvelope<TData> = BaseResponse<TData> & {
  meta: ResponseMeta;
};

export function serializeEnvelope<TData>(
  data: TData,
  context?: {
    requestId?: string;
    correlationId?: string;
  },
): ApiEnvelope<TData> {
  return {
    data,
    meta: {
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      version: 'v1',
      timestamp: new Date().toISOString(),
    },
  };
}
