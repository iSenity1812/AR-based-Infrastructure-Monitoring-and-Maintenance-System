import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { NodeMetricsController } from './node-metrics.controller';

describe('NodeMetricsController', () => {
  it('declares dashboard read permission on the node metrics endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      NodeMetricsController.prototype.getNodeMetrics,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates node metrics bootstrap generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      node: {
        nodeId: 'node-a1',
        lastSeenAt: '2026-07-12T09:12:30.000Z',
        freshnessSec: 4,
      },
      metricsConfig: {
        transport: 'socket.io',
        channel: 'monitoring.node.metrics.updated',
        bucketSec: 60,
        retentionSec: 900,
        nodeMetricKeys: ['cpuUsagePct'],
        workloadMetricKeys: ['cpuUsagePct'],
      },
      workloadSummary: {
        total: 0,
        returned: 0,
        selectionMode: 'top_cpu_then_memory',
      },
      workloads: [],
      seedWindow: {
        from: null,
        to: null,
        points: [],
      },
    });
    const controller = new NodeMetricsController({ execute } as never);

    await expect(controller.getNodeMetrics('node-a1')).resolves.toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          nodeId: 'node-a1',
        }),
      }),
    );

    expect(execute).toHaveBeenCalledWith('node-a1');
  });
});
