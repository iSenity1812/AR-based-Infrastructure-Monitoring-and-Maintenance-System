import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type {
  NodeMetricsNodeBucketRecord,
  NodeMetricsReadRepository,
  NodeMetricsWorkloadRecord,
} from '../ports/node-metrics-read.repository';
import {
  buildMetricsConfig,
  selectNodeMetricsWorkloads,
  NodeMetricsComposerService,
} from './node-metrics-composer.service';

describe('selectNodeMetricsWorkloads', () => {
  it('selects top workloads by CPU, then memory, then stable workload id', () => {
    const workloads: NodeMetricsWorkloadRecord[] = [
      createWorkload({ workloadId: 'container-c', cpuUsagePct: 50, memoryUsagePct: 20 }),
      createWorkload({ workloadId: 'container-a', cpuUsagePct: 90, memoryUsagePct: 40 }),
      createWorkload({ workloadId: 'container-b', cpuUsagePct: 90, memoryUsagePct: 50 }),
      createWorkload({ workloadId: 'container-d', cpuUsagePct: 10, memoryUsagePct: 10 }),
      createWorkload({ workloadId: 'container-e', cpuUsagePct: 9, memoryUsagePct: 90 }),
      createWorkload({ workloadId: 'container-f', cpuUsagePct: 8, memoryUsagePct: 90 }),
    ];

    expect(selectNodeMetricsWorkloads(workloads).map((workload) => workload.workloadId)).toEqual([
      'container-b',
      'container-a',
      'container-c',
      'container-d',
      'container-e',
    ]);
  });
});

describe('buildMetricsConfig', () => {
  it('keeps v1 metrics config aligned to 1 minute trend views', () => {
    expect(buildMetricsConfig()).toEqual({
      transport: 'socket.io',
      channel: 'monitoring.node.metrics.updated',
      bucketSec: 60,
      retentionSec: 900,
      nodeMetricKeys: [
        'cpuUsagePct',
        'memoryUsagePct',
        'diskUsagePct',
        'cpuTemperatureC',
        'networkRxBytesSec',
        'networkTxBytesSec',
      ],
      workloadMetricKeys: ['cpuUsagePct', 'memoryUsagePct'],
    });
  });
});

describe('NodeMetricsComposerService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-12T09:12:34.000Z'));
  });

  it('composes REST metrics bootstrap with tracked workloads and seed points', async () => {
    const repository = createRepository({
      workloads: [
        createWorkload({ workloadId: 'container-api', name: 'api', cpuUsagePct: 46.1, memoryUsagePct: 38.7 }),
        createWorkload({ workloadId: 'container-nginx', name: 'nginx', cpuUsagePct: 18.2, memoryUsagePct: 12.4 }),
      ],
      nodeBuckets: [
        createNodeBucket({ ts: '2026-07-12 09:12:00', cpuUsagePct: 79.1 }),
      ],
      workloadBuckets: [
        {
          ts: '2026-07-12 09:12:00',
          workloadId: 'container-api',
          nodeId: 'node-a1',
          cpuUsagePct: 42.8,
          memoryUsagePct: 37.9,
        },
      ],
    });
    const composer = new NodeMetricsComposerService(repository);

    await expect(composer.buildMetrics('node-a1')).resolves.toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          nodeId: 'node-a1',
          lastSeenAt: '2026-07-12T09:12:30.000Z',
          freshnessSec: 4,
        }),
        workloadSummary: {
          total: 2,
          returned: 2,
          selectionMode: 'top_cpu_then_memory',
        },
        seedWindow: expect.objectContaining({
          from: '2026-07-12T09:12:00.000Z',
          to: '2026-07-12T09:12:00.000Z',
        }),
      }),
    );
  });

  it('returns an empty workload payload when the node has no workloads', async () => {
    const repository = createRepository({
      workloads: [],
      nodeBuckets: [createNodeBucket({ ts: '2026-07-12 09:12:00' })],
      workloadBuckets: [],
    });
    const composer = new NodeMetricsComposerService(repository);

    const response = await composer.buildMetrics('node-a1');

    expect(response.workloadSummary).toEqual({
      total: 0,
      returned: 0,
      selectionMode: 'top_cpu_then_memory',
    });
    expect(response.workloads).toEqual([]);
    expect(response.seedWindow.points[0].workloads).toEqual([]);
  });
});

function createRepository(input: {
  workloads: NodeMetricsWorkloadRecord[];
  nodeBuckets: NodeMetricsNodeBucketRecord[];
  workloadBuckets: ReturnType<NodeMetricsReadRepository['listWorkloadSeedBuckets']> extends Promise<infer T> ? T : never;
}): NodeMetricsReadRepository {
  return {
    getCurrentNode: jest.fn().mockResolvedValue({
      nodeId: 'node-a1',
      summaryTs: '2026-07-12 09:12:30',
    }),
    listNodeWorkloads: jest.fn().mockResolvedValue(input.workloads),
    listNodeSeedBuckets: jest.fn().mockResolvedValue(input.nodeBuckets),
    listWorkloadSeedBuckets: jest.fn().mockResolvedValue(input.workloadBuckets),
    getLatestMetricsChangeSummaryTs: jest.fn(),
    listChangedNodeIdsSince: jest.fn(),
  };
}

function createWorkload(
  overrides: Partial<NodeMetricsWorkloadRecord>,
): NodeMetricsWorkloadRecord {
  return {
    workloadId: 'container-1',
    workloadType: 'container',
    summaryTs: '2026-07-12 09:12:30',
    nodeId: 'node-a1',
    name: 'container',
    status: 'running',
    healthStatus: 'healthy',
    cpuUsagePct: 1,
    memoryUsagePct: 1,
    restartCount: 0,
    ...overrides,
  };
}

function createNodeBucket(
  overrides: Partial<NodeMetricsNodeBucketRecord>,
): NodeMetricsNodeBucketRecord {
  return {
    ts: '2026-07-12 09:12:00',
    nodeId: 'node-a1',
    cpuUsagePct: null,
    memoryUsagePct: null,
    diskUsagePct: null,
    cpuTemperatureC: null,
    networkRxBytesSec: null,
    networkTxBytesSec: null,
    ...overrides,
  };
}
