import { apiConfig } from './config';
import { requestJson } from './client';
import type { AuthEnvelope, AuthSession, AuthUser } from '../types/auth';

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  const payload = await requestJson<AuthEnvelope>(
    apiConfig.identityApiUrl,
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
  );

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
