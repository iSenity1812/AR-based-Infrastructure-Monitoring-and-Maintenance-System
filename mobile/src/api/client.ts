type RequestOptions = RequestInit & {
  token?: string | null;
  timeoutMs?: number;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type ApiEnvelope<T> = {
  data: T;
  meta?: {
    timestamp?: string;
    correlationId?: string;
    version?: string;
  };
};

export async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const { token: _token, timeoutMs: _timeoutMs, ...requestOptions } = options;

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...requestOptions,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (caught) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new ApiRequestError('The request timed out. Check the service connection and try again.', undefined, 'NETWORK_TIMEOUT');
    }
    const reason = caught instanceof Error ? caught.message : 'Network request failed';
    throw new ApiRequestError(`Cannot reach ${baseUrl}. ${reason}`, undefined, 'NETWORK_UNAVAILABLE');
  }
  clearTimeout(timeout);
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    const details = extractErrorDetails(payload);
    throw new ApiRequestError(details.message ?? `Request failed: ${response.status}`, response.status, details.code);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

function extractErrorDetails(payload: unknown): { message: string | null; code?: string } {
  if (!payload || typeof payload !== 'object') {
    return { message: null };
  }

  if ('error' in payload) {
    const error = (payload as { error?: { message?: string; code?: string } }).error;
    return { message: error?.message ?? null, code: error?.code };
  }

  if ('message' in payload) {
    return { message: String((payload as { message?: unknown }).message) };
  }

  return { message: null };
}
