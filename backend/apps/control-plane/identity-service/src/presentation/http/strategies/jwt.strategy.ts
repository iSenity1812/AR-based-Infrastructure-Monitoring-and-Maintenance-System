import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IdentityServiceConfig } from '../../../infrastructure/config/identity-service-config';
import type { CurrentAuthContextDto } from '../../../use-cases/dto/current-auth-context.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: IdentityServiceConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessTokenSecret,
    });
  }

  validate(payload: CurrentAuthContextDto): CurrentAuthContextDto {
    return payload;
  }
}
