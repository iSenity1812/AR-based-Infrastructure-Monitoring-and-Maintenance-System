import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { AccessTokenPayload, AuthUser } from './auth.types';
import { UserStatus } from '../users/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.typ !== 'access')
      throw new UnauthorizedException('Invalid token type');

    const session = await this.sessionsService.requireActiveSession(
      payload.sid,
    );
    this.sessionsService.assertSessionOwnedByUser(
      session,
      this.usersService.toObjectId(payload.sub),
    );

    const userWithRoles = await this.usersService.requireByIdWithRoles(
      payload.sub,
    );
    if (userWithRoles.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User inactive');
    }

    const roles = userWithRoles.roles.map((role) => ({
      id: role._id.toString(),
      name: role.name,
      capabilityKeys: role.capabilityKeys ?? [],
    }));
    const capabilityKeys = Array.from(
      new Set(roles.flatMap((role) => role.capabilityKeys ?? [])),
    ).sort();

    return {
      userId: userWithRoles._id.toString(),
      sessionId: session._id.toString(),
      username: userWithRoles.username,
      email: userWithRoles.email,
      status: userWithRoles.status,
      roles,
      capabilityKeys,
    };
  }
}
