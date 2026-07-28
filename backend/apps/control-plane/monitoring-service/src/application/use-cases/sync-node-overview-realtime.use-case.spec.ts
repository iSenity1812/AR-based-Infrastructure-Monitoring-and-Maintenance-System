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
    expect(monitoringRealtimePort.emitNodeOverviewChanged).not.toHaveBeenCalled();
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
    const buildOverview = jest
      .fn()
      .mockResolvedValue({
        node: {
          nodeId: 'node-a1',
          status: 'alerting',
          severity: 'high',
          lastSeenAt: '2026-07-10T10:01:00.000Z',
          freshnessSec: 1,
          fingerprintSeenAt: '2026-07-10T10:00:30.000Z',
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
        summaryMetrics: {
          primaryNicStatus: { value: 'up', unit: 'state' },
          worstMetric: {
            metricKey: 'node.cpu_usage_pct',
            metricValueNumeric: 10,
            metricValueText: '10',
          },
          alertCounters: {
            criticalMetricCount: 1,
            warningMetricCount: 0,
            staleMetricCount: 0,
          },
        },
        workloadSummary: {
          total: 1,
          unhealthy: 0,
          nonRunning: 0,
          returned: 1,
          selectionMode: 'abnormal_first_then_top_cpu',
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

    expect(monitoringRealtimePort.emitNodeOverviewChanged).toHaveBeenCalledTimes(1);
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
