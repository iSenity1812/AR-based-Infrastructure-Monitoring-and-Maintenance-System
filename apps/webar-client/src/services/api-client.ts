type ApiEnvelope<T> = {
  data: T;
};

export const AR_ACCESS_TOKEN_STORAGE_KEY = 'ar-imms.ar.access-token';

export function bootstrapArAccessTokenFromFragment(): string | null {
  const fragment = window.location.hash.replace(/^#/, '');
  if (!fragment) {
    return getArAccessToken();
  }

  const params = new URLSearchParams(fragment);
  const token = params.get('access_token')?.trim();
  if (!token) {
    return getArAccessToken();
  }

  window.sessionStorage.setItem(AR_ACCESS_TOKEN_STORAGE_KEY, token);
  params.delete('access_token');

  const remainingFragment = params.toString();
  const cleanUrl = `${window.location.pathname}${window.location.search}${remainingFragment ? `#${remainingFragment}` : ''}`;
  window.history.replaceState(window.history.state, document.title, cleanUrl);

  return token;
}

export function getArAccessToken(): string | null {
  return window.sessionStorage.getItem(AR_ACCESS_TOKEN_STORAGE_KEY);
}

export async function requestApiData<T>(
  url: string,
  token: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    const detail = await readApiError(response);
    throw new Error(
      `Request failed with HTTP ${response.status}${detail ? `: ${detail}` : '.'}`,
    );
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new Error('API response did not contain a data envelope.');
  }

  return envelope.data;
}

async function readApiError(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as {
      detail?: unknown;
      message?: unknown;
      error?: { message?: unknown } | unknown;
    };

    if (typeof payload.detail === 'string') return payload.detail;
    if (typeof payload.message === 'string') return payload.message;
    if (
      payload.error &&
      typeof payload.error === 'object' &&
      'message' in payload.error &&
      typeof payload.error.message === 'string'
    ) {
      return payload.error.message;
    }
  } catch {
    return null;
  }

  return null;
}
