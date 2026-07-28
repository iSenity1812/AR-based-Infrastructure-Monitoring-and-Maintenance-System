type RequestOptions = RequestInit & {
  token?: string | null;
};

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

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (caught) {
    const reason = caught instanceof Error ? caught.message : 'Network request failed';
    throw new Error(`Cannot reach ${baseUrl}. ${reason}`);
  }
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | T
    | null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) ?? `Request failed: ${response.status}`);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('error' in payload) {
    const error = (payload as { error?: { message?: string } }).error;
    return error?.message ?? null;
  }

  if ('message' in payload) {
    return String((payload as { message?: unknown }).message);
  }

  return null;
}
