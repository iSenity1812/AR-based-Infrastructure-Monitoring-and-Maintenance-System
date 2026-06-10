import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';
import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AssetServiceConfig) {
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
