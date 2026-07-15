import { describe, expect, it, jest } from '@jest/globals';

import type { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import type { NodeMetricsReadRepository } from '../ports/node-metrics-read.repository';
import type { NodeMetricsComposerService } from '../services/node-metrics-composer.service';
import { SyncNodeMetricsRealtimeUseCase } from './sync-node-metrics-realtime.use-case';

describe('SyncNodeMetricsRealtimeUseCase', () => {
  it('initializes checkpoint on first run without emitting', async () => {
    const repository = createRepository({
      latestSummaryTs: '2026-07-12 09:12:00',
      changedNodeIds: [],
    });
    const realtimePort = createRealtimePort();
    const useCase = new SyncNodeMetricsRealtimeUseCase(
      repository,
      createComposer(),
      realtimePort,
    );

    await expect(useCase.execute()).resolves.toEqual({
      emittedMetricEvents: 0,
      emittedWorkloadMembershipEvents: 0,
      changedNodeIds: 0,
      nextCheckpointSummaryTs: '2026-07-12 09:12:00',
      initialized: true,
    });
    expect(realtimePort.emitNodeMetricsUpdated).not.toHaveBeenCalled();
    expect(realtimePort.emitNodeMetricsWorkloadsChanged).not.toHaveBeenCalled();
  });

  it('emits metrics deltas and workload membership only when public fingerprints change', async () => {
    const repository = createRepository({
      latestSummaryTs: '2026-07-12 09:12:00',
      changedNodeIds: ['node-a1'],
    });
    const realtimePort = createRealtimePort();
    const composer = createComposer();
    const useCase = new SyncNodeMetricsRealtimeUseCase(
      repository,
      composer,
      realtimePort,
    );

    await useCase.execute();
    await useCase.execute();
    await useCase.execute();

    expect(realtimePort.emitNodeMetricsUpdated).toHaveBeenCalledTimes(1);
    expect(realtimePort.emitNodeMetricsWorkloadsChanged).toHaveBeenCalledTimes(1);
  });
});

function createRepository(input: {
  latestSummaryTs: string;
  changedNodeIds: string[];
}): NodeMetricsReadRepository {
  return {
    getCurrentNode: jest.fn(),
    listNodeWorkloads: jest.fn(),
    listNodeSeedBuckets: jest.fn(),
    listWorkloadSeedBuckets: jest.fn(),
    getLatestMetricsChangeSummaryTs: jest
      .fn()
      .mockResolvedValue(input.latestSummaryTs),
    listChangedNodeIdsSince: jest.fn().mockResolvedValue(input.changedNodeIds),
  };
}

function createRealtimePort(): MonitoringRealtimePort {
  return {
    emitRackStateChanged: jest.fn(),
    emitNodeOverviewUpdated: jest.fn(),
    emitNodeMetricsUpdated: jest.fn(),
    emitNodeMetricsWorkloadsChanged: jest.fn(),
  };
}

function createComposer(): NodeMetricsComposerService {
  return {
    buildWorkloadsChangedEvent: jest.fn().mockResolvedValue({
      event: 'monitoring.node.metrics.workloads.changed',
      nodeId: 'node-a1',
      ts: '2026-07-12T09:13:00.000Z',
      workloadSummary: {
        total: 1,
        returned: 1,
        selectionMode: 'top_cpu_then_memory',
      },
      workloads: [
        {
          workloadId: 'container-api',
          workloadType: 'container',
          name: 'api',
          status: 'running',
          latestCpuUsagePct: 49.2,
          latestMemoryUsagePct: 39.8,
        },
      ],
    }),
    buildUpdatedEvent: jest.fn().mockResolvedValue({
      event: 'monitoring.node.metrics.updated',
      nodeId: 'node-a1',
      ts: '2026-07-12T09:13:00.000Z',
      bucketSec: 60,
      node: {
        cpuUsagePct: 84.1,
        memoryUsagePct: 76.8,
        diskUsagePct: 71.4,
        cpuTemperatureC: 81,
        networkRxBytesSec: 2510000,
        networkTxBytesSec: 1840000,
      },
      workloads: [
        {
          workloadId: 'container-api',
          cpuUsagePct: 47.3,
          memoryUsagePct: 39.1,
        },
      ],
    }),
  } as unknown as NodeMetricsComposerService;
}
