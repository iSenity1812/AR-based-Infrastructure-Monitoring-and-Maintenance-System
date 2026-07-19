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
      nodeId: 'node-a1',
      metricsConfig: {
        transport: 'socket.io',
        channel: 'monitoring.node.metrics.updated',
        bucketSec: 60,
        retentionSec: 900,
        nodeMetricKeys: ['cpuUsagePct'],
        workloadMetricKeys: ['cpuUsagePct'],
      },
      meta: {
        units: {
          cpuUsagePct: '%',
          memoryUsagePct: '%',
          diskUsagePct: '%',
          cpuTemperatureC: 'C',
          networkRxBytesSec: 'bytes/sec',
          networkTxBytesSec: 'bytes/sec',
          workloadCpuUsagePct: '%',
          workloadMemoryUsagePct: '%',
        },
      },
      workloads: [],
      seedWindow: {
        from: null,
        to: null,
        resolutionSec: 60,
        timestamps: [],
        nodeMetrics: {
          cpuUsagePct: [],
          memoryUsagePct: [],
          diskUsagePct: [],
          cpuTemperatureC: [],
          networkRxBytesSec: [],
          networkTxBytesSec: [],
        },
        workloadMetrics: {},
      },
    });
    const controller = new NodeMetricsController({ execute } as never);

    await expect(
      controller.getNodeMetrics(
        'node-a1',
        '2026-07-12T09:00:00.000Z',
        '2026-07-12T09:12:00.000Z',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        nodeId: 'node-a1',
      }),
    );

    expect(execute).toHaveBeenCalledWith('node-a1', {
      from: '2026-07-12T09:00:00.000Z',
      to: '2026-07-12T09:12:00.000Z',
    });
  });
});
