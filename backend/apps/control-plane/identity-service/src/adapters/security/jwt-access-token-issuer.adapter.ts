import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  type AccessTokenIssuerPort,
  type AccessTokenPayload,
} from '../../domain/ports/access-token-issuer.port';
import { IdentityServiceConfig } from '../../infrastructure/config/identity-service-config';

@Injectable()
export class JwtAccessTokenIssuerAdapter implements AccessTokenIssuerPort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: IdentityServiceConfig,
  ) {}

  issue(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.accessTokenSecret,
      expiresIn: this.config.accessTokenTtl,
    });
  }
}
