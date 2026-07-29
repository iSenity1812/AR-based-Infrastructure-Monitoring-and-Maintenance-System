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
        reason: 'none',
        lastSeenAt: '2026-07-10T19:00:00.000+07:00',
        hardware: {
          batteryModel: 'MS-158L',
          cpuArchitecture: '386',
          cpuModel: 'AMD Ryzen 7 5800H with Radeon Graphics',
          gpuModelPrimary: 'AMD Radeon(TM) Graphics',
          hardwareSerial: 'BSS-0123456789',
          logicalCpuCount: 16,
          macAddress: '50:C2:E8:0B:14:A5',
          motherboardModel: 'MSI MS-158L',
          osProduct: 'Windows 11',
          primaryIpv4: '192.168.1.2',
          ssdModelPrimary: 'KINGSTON SNV2S1000G',
        },
        collector: {
          status: 'online',
          reason: 'none',
          lastHeartbeatAt: '2026-07-10T18:59:45.000+07:00',
          heartbeatTimeoutSec: 90,
        },
      },
      summaryMetrics: {
        primaryNicStatus: 'up',
        uptimeSec: 34880,
        primaryIssue: {
          type: 'metric_alert',
          metricKey: 'node.cpu_usage_pct',
          value: '10',
        },
        alertCounters: {
          critical: 0,
          warning: 0,
          stale: 0,
        },
      },
      workloadSummary: {
        total: 0,
        healthy: 0,
        unhealthy: 0,
      },
      workloads: [],
      realtime: {
        transport: 'socket.io',
        channel: 'monitoring.node.node-a1.overview.changed',
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
