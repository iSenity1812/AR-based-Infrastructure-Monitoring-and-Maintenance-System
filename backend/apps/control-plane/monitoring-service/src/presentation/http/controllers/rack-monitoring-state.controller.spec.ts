import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { RackMonitoringStateController } from './rack-monitoring-state.controller';

describe('RackMonitoringStateController', () => {
  it('declares dashboard read permission on the rack monitoring state endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      RackMonitoringStateController.prototype.getRackMonitoringState,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates rack monitoring state generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      generatedAt: '2026-07-08T10:00:00.000Z',
      scope: 'rack',
      view: 'monitoring_state',
      items: [],
    });
    const controller = new RackMonitoringStateController({
      execute,
    } as never);

    await expect(controller.getRackMonitoringState()).resolves.toEqual({
      generatedAt: '2026-07-08T10:00:00.000Z',
      scope: 'rack',
      view: 'monitoring_state',
      items: [],
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
