import { describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';

import { MonitoringServiceConfig } from '../../../../infrastructure/config/monitoring-service-config';
import { ExternalAlertSyncSecretGuard } from './external-alert-sync-secret.guard';

describe('ExternalAlertSyncSecretGuard', () => {
  it('allows requests with matching shared secret', () => {
    const guard = new ExternalAlertSyncSecretGuard(
      new MonitoringServiceConfig({
        MONITORING_ALERT_SYNC_SHARED_SECRET: 'secret-123',
      } as NodeJS.ProcessEnv),
    );

    expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-monitoring-sync-secret': 'secret-123',
            },
          }),
        }),
      } as never),
    ).toBe(true);
  });

  it('rejects requests with missing or wrong shared secret', () => {
    const guard = new ExternalAlertSyncSecretGuard(
      new MonitoringServiceConfig({
        MONITORING_ALERT_SYNC_SHARED_SECRET: 'secret-123',
      } as NodeJS.ProcessEnv),
    );

    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as never),
    ).toThrow(UnauthorizedException);

    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'x-monitoring-sync-secret': 'wrong',
            },
          }),
        }),
      } as never),
    ).toThrow(UnauthorizedException);
  });
});
