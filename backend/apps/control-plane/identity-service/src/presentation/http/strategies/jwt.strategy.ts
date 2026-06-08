import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { SESSION_REPOSITORY } from '../../../domain/ports/port.tokens';
import type { SessionRepositoryPort } from '../../../domain/ports/session-repository.port';
import { IdentityServiceConfig } from '../../../infrastructure/config/identity-service-config';
import type { CurrentAuthContextDto } from '../../../use-cases/dto/current-auth-context.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: IdentityServiceConfig,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessTokenSecret,
    });
  }

  async validate(payload: CurrentAuthContextDto): Promise<CurrentAuthContextDto> {
    const session = await this.sessionRepository.findById(payload.sessionId);

    if (!session || !session.isActive(new Date())) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    return payload;
  }
}
