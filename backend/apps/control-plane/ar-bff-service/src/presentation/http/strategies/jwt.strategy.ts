import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';

interface JwtPayload {
  sub?: string;
  userId?: string;
  username?: string;
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ArBffServiceConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessTokenSecret,
    });
  }

  validate(payload: JwtPayload): CurrentAuthContextDto {
    return {
      userId: payload.sub ?? payload.userId ?? '',
      username: payload.username,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions
        : [],
    };
  }
}
