type ApiEnvelope<T> = {
  data: T;
};

export const AR_ACCESS_TOKEN_STORAGE_KEY = 'ar-imms.ar.access-token';

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
    throw new Error(`Request failed with HTTP ${response.status}.`);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new Error('API response did not contain a data envelope.');
  }

  return envelope.data;
}
