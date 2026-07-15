import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { NodeMonitoringStateController } from './node-monitoring-state.controller';

describe('NodeMonitoringStateController', () => {
  it('declares dashboard read permission on the node monitoring state endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      NodeMonitoringStateController.prototype.getNodeMonitoringState,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates node monitoring state generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      generatedAt: '2026-07-15T15:16:59.298Z',
      scope: 'node',
      view: 'node_alert_state',
      items: [],
    });
    const controller = new NodeMonitoringStateController({
      execute,
    } as never);

    await expect(controller.getNodeMonitoringState()).resolves.toEqual({
      generatedAt: '2026-07-15T15:16:59.298Z',
      scope: 'node',
      view: 'node_alert_state',
      items: [],
    });

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
