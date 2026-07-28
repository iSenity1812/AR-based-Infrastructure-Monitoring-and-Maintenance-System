import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { ScopeInvestigationController } from './scope-investigation.controller';

describe('ScopeInvestigationController', () => {
  it('declares dashboard read permission on the scope investigation endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      ScopeInvestigationController.prototype.getScopeInvestigation,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates node investigation requests to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      generatedAt: '2026-07-23T04:30:00.000Z',
      scope: {
        scopeType: 'node',
        scopeId: 'node-a1',
        nodeId: 'node-a1',
        nodeCode: 'node-a1',
        displayName: 'Node A1',
      },
      currentContext: {},
      window: {
        from: '2026-07-23T04:00:00.000Z',
        to: '2026-07-23T04:30:00.000Z',
        interval: '1m',
        pointCount: 31,
      },
      metricSeries: [],
      monitoringTimeline: [],
      sourceRefs: [],
    });
    const controller = new ScopeInvestigationController({ execute } as never);

    await expect(
      controller.getScopeInvestigation(
        'node',
        'node-a1',
        '2026-07-23T04:00:00.000Z',
        '2026-07-23T04:30:00.000Z',
        '1m',
        'cpu_temperature_c_current',
        'Bearer token',
        'corr-1',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        scope: expect.objectContaining({
          scopeType: 'node',
        }),
      }),
    );

    expect(execute).toHaveBeenCalledWith({
      scopeType: 'node',
      scopeId: 'node-a1',
      from: '2026-07-23T04:00:00.000Z',
      to: '2026-07-23T04:30:00.000Z',
      interval: '1m',
      metricKey: 'cpu_temperature_c_current',
      authorizationHeader: 'Bearer token',
      correlationId: 'corr-1',
    });
  });
});
