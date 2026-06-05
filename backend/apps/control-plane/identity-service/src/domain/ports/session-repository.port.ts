import { IdentitySession } from '../entities/identity-session.entity';

export interface CreateSessionRecord {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionRepositoryPort {
  create(input: CreateSessionRecord): Promise<IdentitySession>;
  findById(sessionId: string): Promise<IdentitySession | null>;
  updateRefreshToken(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<IdentitySession | null>;
  revoke(sessionId: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
}
