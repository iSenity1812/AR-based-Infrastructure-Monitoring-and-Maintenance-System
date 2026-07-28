import { randomUUID } from 'node:crypto';

export interface ApiEnvelopeMeta {
  timestamp: string;
  correlationId: string;
  version: string;
  [key: string]: unknown;
}

export interface ApiEnvelope<TData> {
  data: TData;
  meta: ApiEnvelopeMeta;
}

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

const API_VERSION = 'v1';
const CORRELATION_ID_HEADERS = ['x-correlation-id', 'x-request-id'];

function getHeaderValue(
  request: RequestLike | undefined,
  headerName: string,
): string | undefined {
  const headerValue = request?.headers?.[headerName];
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
}

export function resolveCorrelationId(request?: RequestLike): string {
  for (const headerName of CORRELATION_ID_HEADERS) {
    const headerValue = getHeaderValue(request, headerName);
    if (headerValue?.trim()) {
      return headerValue.trim();
    }
  }

  return randomUUID();
}

export function buildEnvelopeMeta(
  request?: RequestLike,
  additionalMeta: Record<string, unknown> = {},
): ApiEnvelopeMeta {
  return {
    timestamp: new Date().toISOString(),
    correlationId: resolveCorrelationId(request),
    version: API_VERSION,
    ...additionalMeta,
  };
}

export function serializeEnvelope<TData>(
  data: TData,
  request?: RequestLike,
  additionalMeta: Record<string, unknown> = {},
): ApiEnvelope<TData> {
  return {
    data,
    meta: buildEnvelopeMeta(request, additionalMeta),
  };
}
