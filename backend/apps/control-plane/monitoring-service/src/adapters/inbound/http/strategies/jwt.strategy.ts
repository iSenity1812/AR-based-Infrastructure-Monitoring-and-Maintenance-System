import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MonitoringServiceConfig } from '../../../../infrastructure/config/monitoring-service-config';
import { CurrentAuthContextDto } from '../../../../application/use-cases/dto/current-auth-context.dto';

type JwtPayload = {
  userId: string;
  username: string;
  sessionId: string;
  roles?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: MonitoringServiceConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessTokenSecret,
    });
  }

  validate(payload: JwtPayload): CurrentAuthContextDto {
    return {
      userId: payload.userId,
      username: payload.username,
      sessionId: payload.sessionId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      mustChangePassword: payload.mustChangePassword ?? false,
    };
  }
}
