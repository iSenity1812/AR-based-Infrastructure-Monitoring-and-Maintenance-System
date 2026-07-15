import 'reflect-metadata';
import { describe, expect, it, jest } from '@jest/globals';

import {
  INTERNAL_ALERT_SYNC_ROUTE_KEY,
} from '@adapters/inbound/http/decorators/internal-alert-sync-route.decorator';
import { PUBLIC_KEY } from '@adapters/inbound/http/decorators/public.decorator';

import { ExternalAlertSyncController } from './external-alert-sync.controller';

describe('ExternalAlertSyncController', () => {
  it('marks the sync endpoint as internal and public for jwt bypass', () => {
    expect(
      Reflect.getMetadata(
        INTERNAL_ALERT_SYNC_ROUTE_KEY,
        ExternalAlertSyncController.prototype.syncExternalAlerts,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        PUBLIC_KEY,
        ExternalAlertSyncController.prototype.syncExternalAlerts,
      ),
    ).toBe(true);
  });

  it('delegates sync processing to the use case and returns summary counts', async () => {
    const execute = jest.fn().mockResolvedValue({
      totalReceived: 2,
      synced: 1,
      invalid: 1,
      skipped: 0,
      results: [],
    });
    const controller = new ExternalAlertSyncController({
      execute,
    } as never);

    const result = await controller.syncExternalAlerts({
      receiver: 'monitoring-rack-lab',
      status: 'firing',
      alerts: [],
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      totalReceived: 2,
      synced: 1,
      invalid: 1,
      skipped: 0,
    });
  });
});
