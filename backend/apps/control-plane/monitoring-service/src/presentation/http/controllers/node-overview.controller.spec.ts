import 'reflect-metadata';

import { PERMISSION_CODES } from '@adapters/inbound/http/constants/permission-code.constant';
import { REQUIRED_PERMISSIONS_KEY } from '@adapters/inbound/http/decorators/require-permissions.decorator';

import { NodeOverviewController } from './node-overview.controller';

describe('NodeOverviewController', () => {
  it('declares dashboard read permission on the node overview endpoint', () => {
    const permissions = Reflect.getMetadata(
      REQUIRED_PERMISSIONS_KEY,
      NodeOverviewController.prototype.getNodeOverview,
    );

    expect(permissions).toEqual([PERMISSION_CODES.DASHBOARD_READ]);
  });

  it('delegates node overview generation to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      node: {
        nodeId: 'node-a1',
        status: 'healthy',
        severity: 'none',
        lastSeenAt: '2026-07-10T12:00:00.000Z',
        freshnessSec: 1,
      },
      summaryMetrics: {
        cpuUsagePct: 10,
        memoryUsagePct: 20,
        diskUsagePct: 30,
        cpuTemperatureC: 40,
        networkRxBytesSec: 50,
        networkTxBytesSec: 60,
        primaryNicStatus: 'up',
        worstMetric: {
          metricKey: 'node.cpu_usage_pct',
          metricValueNumeric: 10,
          metricValueText: '10',
        },
        alertCounters: {
          criticalMetricCount: 0,
          warningMetricCount: 0,
          staleMetricCount: 0,
        },
      },
      workloadSummary: {
        total: 0,
        unhealthy: 0,
        nonRunning: 0,
        highCpu: 0,
        highMemory: 0,
        returned: 0,
        selectionMode: 'abnormal_first_then_top_cpu',
      },
      workloads: [],
      realtime: {
        channel: 'monitoring.node.overview.updated',
        version: 1,
      },
    });
    const controller = new NodeOverviewController({ execute } as never);

    await expect(controller.getNodeOverview('node-a1')).resolves.toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          nodeId: 'node-a1',
        }),
      }),
    );

    expect(execute).toHaveBeenCalledWith('node-a1');
  });
});
