import { UserStatus } from '../users/user-status.enum';

export type AuthRole = {
  id: string;
  name: string;
  capabilityKeys: string[];
};

export type AuthUser = {
  userId: string;
  sessionId: string;
  username: string;
  email: string;
  status: UserStatus;
  roles: AuthRole[];
  capabilityKeys: string[];
};

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  typ: 'refresh';
};
