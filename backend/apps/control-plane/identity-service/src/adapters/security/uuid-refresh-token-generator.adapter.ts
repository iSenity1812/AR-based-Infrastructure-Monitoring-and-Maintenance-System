import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { RefreshTokenGeneratorPort } from '../../domain/ports/refresh-token-generator.port';

@Injectable()
export class UuidRefreshTokenGeneratorAdapter
  implements RefreshTokenGeneratorPort
{
  generate(): string {
    return randomUUID();
  }
}
