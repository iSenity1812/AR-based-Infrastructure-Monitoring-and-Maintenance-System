import { apiConfig } from './config';
import { ApiRequestError, requestJson } from './client';
import type { AuthEnvelope, AuthSession, AuthUser } from '../types/auth';

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  let payload: AuthEnvelope;
  try {
    payload = await requestJson<AuthEnvelope>(
      apiConfig.identityApiUrl,
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        timeoutMs: 10_000,
      },
    );
  } catch (caught) {
    if (caught instanceof ApiRequestError) {
      if (caught.status === 401 || caught.status === 403 || caught.code === 'UNAUTHENTICATED') {
        throw new Error('Incorrect email or password.');
      }
      if ([502, 503, 504].includes(caught.status ?? 0)) {
        throw new Error('The sign-in service is temporarily unavailable. Please try again.');
      }
      if (caught.code === 'NETWORK_TIMEOUT') {
        throw new Error('Sign in timed out. Check your connection and try again.');
      }
    }
    throw caught;
  }

  const accessToken = payload.accessToken ?? payload.tokens?.accessToken;
  const refreshToken = payload.refreshToken ?? payload.tokens?.refreshToken;
  const sessionId = payload.sessionId ?? payload.tokens?.sessionId;

  if (!accessToken || !payload.user) {
    throw new Error('Login response did not include a session.');
  }

  const userId = payload.user.userId ?? payload.user.id ?? '';

  return {
    accessToken,
    refreshToken,
    sessionId,
    user: {
      id: userId,
      userId,
      username: payload.user.username ?? email,
      email: payload.user.email ?? email,
      fullName: payload.user.fullName ?? payload.user.username ?? email,
      roles: payload.user.roles ?? payload.user.roleCodes ?? [],
      permissions: payload.user.permissions ?? [],
    } satisfies AuthUser,
  };
}
