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
        lastSeenAt: '2026-07-10T12:00:00.000Z',
        fingerprintSeenAt: '2026-07-10T11:59:00.000Z',
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
          lastHeartbeatAt: '2026-07-10T11:59:45.000Z',
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
        unhealthy: 0,
        nonRunning: 0,
        returned: 0,
        selectionMode: 'abnormal_first_then_top_cpu',
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
