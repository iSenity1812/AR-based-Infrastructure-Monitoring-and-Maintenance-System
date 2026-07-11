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
    };
    const nodeOverviewComposerService = {
      buildOverview: jest.fn(),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
      emitNodeOverviewUpdated: jest.fn(),
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
    expect(monitoringRealtimePort.emitNodeOverviewUpdated).not.toHaveBeenCalled();
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
            criticalMetricCount: 1,
            warningMetricCount: 0,
            staleMetricCount: 0,
          },
        },
        workloadSummary: {
          total: 1,
          unhealthy: 0,
          nonRunning: 0,
          highCpu: 0,
          highMemory: 0,
          returned: 1,
          selectionMode: 'abnormal_first_then_top_cpu',
        },
        workloads: [],
        realtime: {
          channel: 'monitoring.node.overview.updated',
          version: 1,
        },
      });
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
      emitNodeOverviewUpdated: jest.fn(),
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

    expect(monitoringRealtimePort.emitNodeOverviewUpdated).toHaveBeenCalledTimes(1);
    expect(secondResult.emittedEvents).toBe(0);
  });
});
