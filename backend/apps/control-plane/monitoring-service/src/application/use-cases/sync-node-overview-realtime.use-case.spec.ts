import { describe, expect, it, jest } from '@jest/globals';

import type { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import type { NodeOverviewReadRepository } from '../ports/node-overview-read.repository';
import { SyncNodeOverviewRealtimeUseCase } from './sync-node-overview-realtime.use-case';

describe('SyncNodeOverviewRealtimeUseCase', () => {
  it('initializes checkpoint without emitting events on the first run', async () => {
    const nodeOverviewReadRepository: NodeOverviewReadRepository = {
      getCurrentNode: jest.fn(),
      listNodeWorkloads: jest.fn(),
      getLatestNodeChangeSummaryTs: jest
        .fn()
        .mockResolvedValue('2026-07-10 10:00:00'),
      listChangedNodeIdsSince: jest.fn(),
      listNodeIdsForOverviewSync: jest.fn().mockResolvedValue([]),
    };
    const nodeOverviewComposerService = {
      buildOverview: jest.fn(),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
      emitRackOverviewUpdated: jest.fn(),
      emitNodeOverviewChanged: jest.fn(),
      emitNodeMetricsUpdated: jest.fn(),
      emitNodeMetricsWorkloadsChanged: jest.fn(),
    };
    const useCase = new SyncNodeOverviewRealtimeUseCase(
      nodeOverviewReadRepository,
      nodeOverviewComposerService as never,
      monitoringRealtimePort,
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      emittedEvents: 0,
      changedNodeIds: 0,
      nextCheckpointSummaryTs: '2026-07-10 10:00:00',
      initialized: true,
    });
    expect(
      monitoringRealtimePort.emitNodeOverviewChanged,
    ).not.toHaveBeenCalled();
  });

  it('emits only when the composed overview fingerprint changes', async () => {
    const nodeOverviewReadRepository: NodeOverviewReadRepository = {
      getCurrentNode: jest.fn(),
      listNodeWorkloads: jest.fn(),
      getLatestNodeChangeSummaryTs: jest
        .fn()
        .mockResolvedValueOnce('2026-07-10 10:00:00')
        .mockResolvedValueOnce('2026-07-10 10:01:00')
        .mockResolvedValueOnce('2026-07-10 10:02:00'),
      listChangedNodeIdsSince: jest
        .fn()
        .mockResolvedValueOnce(['node-a1'])
        .mockResolvedValueOnce(['node-a1']),
      listNodeIdsForOverviewSync: jest
        .fn()
        .mockResolvedValueOnce(['node-a1'])
        .mockResolvedValueOnce(['node-a1']),
    };
    const buildOverview = jest.fn().mockResolvedValue({
      node: {
        nodeId: 'node-a1',
        status: 'critical',
        reason: 'critical_metric',
        lastSeenAt: '2026-07-10T10:01:00.000Z',
        fingerprintSeenAt: '2026-07-10T10:00:30.000Z',
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
          lastHeartbeatAt: '2026-07-10T10:00:45.000Z',
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
          critical: 1,
          warning: 0,
          stale: 0,
        },
      },
      workloadSummary: {
        total: 1,
        healthy: 1,
        unhealthy: 0,
      },
      workloads: [],
      realtime: {
        transport: 'socket.io',
        channel: 'monitoring.node.node-a1.overview.changed',
      },
    });
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
      emitRackOverviewUpdated: jest.fn(),
      emitNodeOverviewChanged: jest.fn(),
      emitNodeMetricsUpdated: jest.fn(),
      emitNodeMetricsWorkloadsChanged: jest.fn(),
    };
    const useCase = new SyncNodeOverviewRealtimeUseCase(
      nodeOverviewReadRepository,
      {
        buildOverview,
      } as never,
      monitoringRealtimePort,
    );

    await useCase.execute();
    await useCase.execute();
    const secondResult = await useCase.execute();

    expect(
      monitoringRealtimePort.emitNodeOverviewChanged,
    ).toHaveBeenCalledTimes(1);
    expect(monitoringRealtimePort.emitNodeOverviewChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'monitoring.node.overview.changed',
        nodeId: 'node-a1',
        channel: 'monitoring.node.node-a1.overview.changed',
      }),
    );
    const emittedPayload = (
      monitoringRealtimePort.emitNodeOverviewChanged as jest.Mock
    ).mock.calls[0][0] as Record<string, unknown>;
    expect(emittedPayload).not.toHaveProperty('fingerprint');
    expect(secondResult.emittedEvents).toBe(0);
  });
});
