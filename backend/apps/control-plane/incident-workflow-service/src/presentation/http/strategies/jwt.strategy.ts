import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IncidentWorkflowServiceConfig } from '@infrastructure/config/incident-workflow-service-config';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: IncidentWorkflowServiceConfig) {
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
