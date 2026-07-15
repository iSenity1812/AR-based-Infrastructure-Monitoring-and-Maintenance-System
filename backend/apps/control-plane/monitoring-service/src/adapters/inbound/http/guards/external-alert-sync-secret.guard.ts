import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

import { MonitoringServiceConfig } from '../../../../infrastructure/config/monitoring-service-config';

const EXTERNAL_ALERT_SYNC_SECRET_HEADER = 'x-monitoring-sync-secret';

@Injectable()
export class ExternalAlertSyncSecretGuard implements CanActivate {
  constructor(private readonly config: MonitoringServiceConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const provided = this.readHeader(request.headers);
    const expected = this.config.externalAlertSyncSharedSecret;

    if (!provided || !expected) {
      throw new UnauthorizedException(
        'Valid monitoring sync shared secret is required.',
      );
    }

    if (!safeCompare(provided, expected)) {
      throw new UnauthorizedException('Monitoring sync shared secret is invalid.');
    }

    return true;
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    const header = headers[EXTERNAL_ALERT_SYNC_SECRET_HEADER];

    if (Array.isArray(header)) {
      return typeof header[0] === 'string' ? header[0] : null;
    }

    return typeof header === 'string' ? header : null;
  }
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
