export interface IdentitySessionProps {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class IdentitySession {
  readonly id: string;
  readonly userId: string;
  readonly refreshTokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt?: Date;
  readonly userAgent?: string;
  readonly ipAddress?: string;

  constructor(props: IdentitySessionProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.refreshTokenHash = props.refreshTokenHash;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.userAgent = props.userAgent;
    this.ipAddress = props.ipAddress;
  }

  isActive(now: Date): boolean {
    return !this.revokedAt && this.expiresAt.getTime() > now.getTime();
  }
}
