import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { UserStatus } from '../users/user-status.enum';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get accessTtlSeconds(): number {
    return this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
  }

  private get refreshTtlSeconds(): number {
    return this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS');
  }

  private async signAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: userId,
      sid: sessionId,
      typ: 'access',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtlSeconds,
    });
  }

  private async signRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      typ: 'refresh',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshTtlSeconds,
    });
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
      token,
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      },
    );
    if (payload.typ !== 'refresh')
      throw new UnauthorizedException('Invalid token type');
    return payload;
  }

  async login(params: { usernameOrEmail: string; password: string }) {
    const user = await this.usersService.findByUsernameOrEmail(
      params.usernameOrEmail,
    );
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('User inactive');

    const passwordOk = await bcrypt.compare(params.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    const now = Date.now();
    const expiresAt = new Date(now + this.refreshTtlSeconds * 1000);

    const placeholderHash = await bcrypt.hash(randomUUID(), 10);
    const session = await this.sessionsService.createSession({
      userId: this.usersService.toObjectId(user._id.toString()),
      refreshTokenHash: placeholderHash,
      expiresAt,
    });

    const refreshToken = await this.signRefreshToken(
      user._id.toString(),
      session._id.toString(),
    );
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.sessionsService.rotateSession(
      session._id.toString(),
      refreshTokenHash,
      expiresAt,
    );

    const accessToken = await this.signAccessToken(
      user._id.toString(),
      session._id.toString(),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      accessTokenExpiresInSeconds: this.accessTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTtlSeconds,
    };
  }

  async refresh(params: { refreshToken: string }) {
    const payload = await this.verifyRefreshToken(params.refreshToken);
    const session = await this.sessionsService.requireActiveSession(
      payload.sid,
    );
    this.sessionsService.assertSessionOwnedByUser(
      session,
      this.usersService.toObjectId(payload.sub),
    );

    const refreshOk = await bcrypt.compare(
      params.refreshToken,
      session.refreshTokenHash,
    );
    if (!refreshOk) throw new UnauthorizedException('Invalid session');

    const now = Date.now();
    const nextExpiresAt = new Date(now + this.refreshTtlSeconds * 1000);

    const nextRefreshToken = await this.signRefreshToken(
      payload.sub,
      payload.sid,
    );
    const nextRefreshTokenHash = await bcrypt.hash(nextRefreshToken, 10);
    await this.sessionsService.rotateSession(
      payload.sid,
      nextRefreshTokenHash,
      nextExpiresAt,
    );

    const accessToken = await this.signAccessToken(payload.sub, payload.sid);
    return {
      accessToken,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer' as const,
      accessTokenExpiresInSeconds: this.accessTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTtlSeconds,
    };
  }

  async logout(params: { refreshToken: string }) {
    const payload = await this.verifyRefreshToken(params.refreshToken);
    const session = await this.sessionsService.requireActiveSession(
      payload.sid,
    );
    this.sessionsService.assertSessionOwnedByUser(
      session,
      this.usersService.toObjectId(payload.sub),
    );

    const refreshOk = await bcrypt.compare(
      params.refreshToken,
      session.refreshTokenHash,
    );
    if (!refreshOk) throw new UnauthorizedException('Invalid session');

    await this.sessionsService.revokeSession(payload.sid);
    return { success: true };
  }
}
