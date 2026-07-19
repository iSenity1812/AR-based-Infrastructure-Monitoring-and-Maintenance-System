import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type {
  NodeMetricsNodeBucketRecord,
  NodeMetricsReadRepository,
  NodeMetricsWorkloadRecord,
} from '../ports/node-metrics-read.repository';
import {
  buildMetricsMeta,
  buildMetricsConfig,
  resolveLiveMetricsSeedWindow,
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
    expect(buildMetricsConfig('node-a1')).toEqual({
      transport: 'socket.io',
      channel: 'monitoring.node.node-a1.metrics.updated',
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

describe('resolveLiveMetricsSeedWindow', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-12T09:12:34.000Z'));
  });

  it('defaults to the last 5 minutes at 5 second resolution', () => {
    expect(resolveLiveMetricsSeedWindow()).toEqual({
      fromTs: '2026-07-12T09:07:30.000Z',
      toTs: '2026-07-12T09:12:30.000Z',
      resolutionSec: 5,
    });
  });

  it('caps the live window to 400 points', () => {
    expect(
      resolveLiveMetricsSeedWindow({
        from: '2026-07-12T08:00:00.000Z',
        to: '2026-07-12T09:12:30.000Z',
        interval: '5',
      }),
    ).toEqual({
      fromTs: '2026-07-12T08:39:15.000Z',
      toTs: '2026-07-12T09:12:30.000Z',
      resolutionSec: 5,
    });
  });
});

describe('buildMetricsMeta', () => {
  it('exposes compact units for node and workload series', () => {
    expect(buildMetricsMeta()).toEqual({
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
    });
  });
});

describe('NodeMetricsComposerService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-12T09:12:34.000Z'));
  });

  it('composes REST metrics bootstrap with flattened tracked workloads and aligned series', async () => {
    const repository = createRepository({
      workloads: [
        createWorkload({ workloadId: 'container-api', name: 'api', cpuUsagePct: 46.1, memoryUsagePct: 38.7 }),
        createWorkload({ workloadId: 'container-nginx', name: 'nginx', cpuUsagePct: 18.2, memoryUsagePct: 12.4 }),
      ],
      nodeBuckets: [
        createNodeBucket({ ts: '2026-07-12 09:11:00', cpuUsagePct: 71.3, memoryUsagePct: 70.2 }),
        createNodeBucket({ ts: '2026-07-12 09:12:00', cpuUsagePct: 79.1 }),
      ],
      workloadBuckets: [
        {
          ts: '2026-07-12 09:11:00',
          workloadId: 'container-api',
          nodeId: 'node-a1',
          cpuUsagePct: 40.2,
          memoryUsagePct: 36.4,
        },
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
        nodeId: 'node-a1',
        meta: buildMetricsMeta(),
        workloads: [
          { workloadId: 'container-api', workloadType: 'container', name: 'api' },
          { workloadId: 'container-nginx', workloadType: 'container', name: 'nginx' },
        ],
        seedWindow: expect.objectContaining({
          from: '2026-07-12T09:11:00.000Z',
          to: '2026-07-12T09:12:00.000Z',
          resolutionSec: 60,
          timestamps: [
            '2026-07-12T09:11:00.000Z',
            '2026-07-12T09:12:00.000Z',
          ],
          nodeMetrics: expect.objectContaining({
            cpuUsagePct: [71.3, 79.1],
          }),
          workloadMetrics: {
            'container-api': {
              cpuUsagePct: [40.2, 42.8],
              memoryUsagePct: [36.4, 37.9],
            },
            'container-nginx': {
              cpuUsagePct: [null, null],
              memoryUsagePct: [null, null],
            },
          },
        }),
      }),
    );
  });

  it('treats ClickHouse bucket timestamps without timezone suffix as UTC so series do not collapse to null', async () => {
    const repository = createRepository({
      workloads: [
        createWorkload({ workloadId: 'container-api', name: 'api' }),
      ],
      nodeBuckets: [
        createNodeBucket({ ts: '2026-07-12 09:11:00', cpuUsagePct: 71.3 }),
        createNodeBucket({ ts: '2026-07-12 09:12:00', cpuUsagePct: 79.1 }),
      ],
      workloadBuckets: [],
    });
    const composer = new NodeMetricsComposerService(repository);

    const response = await composer.buildMetrics('node-a1', {
      from: '2026-07-12T09:11:00.000Z',
      to: '2026-07-12T09:12:00.000Z',
    });

    expect(response.seedWindow.timestamps).toEqual([
      '2026-07-12T09:11:00.000Z',
      '2026-07-12T09:12:00.000Z',
    ]);
    expect(response.seedWindow.nodeMetrics.cpuUsagePct).toEqual([71.3, 79.1]);
  });

  it('returns an empty workload payload when the node has no workloads', async () => {
    const repository = createRepository({
      workloads: [],
      nodeBuckets: [createNodeBucket({ ts: '2026-07-12 09:12:00' })],
      workloadBuckets: [],
    });
    const composer = new NodeMetricsComposerService(repository);

    const response = await composer.buildMetrics('node-a1');

    expect(response.workloads).toEqual([]);
    expect(response.seedWindow.timestamps).toEqual(['2026-07-12T09:12:00.000Z']);
    expect(response.seedWindow.workloadMetrics).toEqual({});
  });

  it('composes live metrics bootstrap with a 5 second grid', async () => {
    const repository = createRepository({
      workloads: [
        createWorkload({ workloadId: 'container-api', name: 'api', cpuUsagePct: 46.1, memoryUsagePct: 38.7 }),
      ],
      nodeBuckets: [],
      workloadBuckets: [],
      liveNodeBuckets: [
        createNodeBucket({ ts: '2026-07-12 09:12:25', cpuUsagePct: 70.1 }),
        createNodeBucket({ ts: '2026-07-12 09:12:30', cpuUsagePct: 72.4 }),
      ],
      liveWorkloadBuckets: [
        {
          ts: '2026-07-12 09:12:25',
          workloadId: 'container-api',
          nodeId: 'node-a1',
          cpuUsagePct: 40.2,
          memoryUsagePct: 36.4,
        },
      ],
    });
    const composer = new NodeMetricsComposerService(repository);

    const response = await composer.buildLiveMetrics('node-a1');

    expect(response.metricsConfig.bucketSec).toBe(5);
    expect(response.seedWindow.resolutionSec).toBe(5);
    expect(response.seedWindow.timestamps).toEqual([
      '2026-07-12T09:07:30.000Z',
      '2026-07-12T09:07:35.000Z',
      '2026-07-12T09:07:40.000Z',
      '2026-07-12T09:07:45.000Z',
      '2026-07-12T09:07:50.000Z',
      '2026-07-12T09:07:55.000Z',
      '2026-07-12T09:08:00.000Z',
      '2026-07-12T09:08:05.000Z',
      '2026-07-12T09:08:10.000Z',
      '2026-07-12T09:08:15.000Z',
      '2026-07-12T09:08:20.000Z',
      '2026-07-12T09:08:25.000Z',
      '2026-07-12T09:08:30.000Z',
      '2026-07-12T09:08:35.000Z',
      '2026-07-12T09:08:40.000Z',
      '2026-07-12T09:08:45.000Z',
      '2026-07-12T09:08:50.000Z',
      '2026-07-12T09:08:55.000Z',
      '2026-07-12T09:09:00.000Z',
      '2026-07-12T09:09:05.000Z',
      '2026-07-12T09:09:10.000Z',
      '2026-07-12T09:09:15.000Z',
      '2026-07-12T09:09:20.000Z',
      '2026-07-12T09:09:25.000Z',
      '2026-07-12T09:09:30.000Z',
      '2026-07-12T09:09:35.000Z',
      '2026-07-12T09:09:40.000Z',
      '2026-07-12T09:09:45.000Z',
      '2026-07-12T09:09:50.000Z',
      '2026-07-12T09:09:55.000Z',
      '2026-07-12T09:10:00.000Z',
      '2026-07-12T09:10:05.000Z',
      '2026-07-12T09:10:10.000Z',
      '2026-07-12T09:10:15.000Z',
      '2026-07-12T09:10:20.000Z',
      '2026-07-12T09:10:25.000Z',
      '2026-07-12T09:10:30.000Z',
      '2026-07-12T09:10:35.000Z',
      '2026-07-12T09:10:40.000Z',
      '2026-07-12T09:10:45.000Z',
      '2026-07-12T09:10:50.000Z',
      '2026-07-12T09:10:55.000Z',
      '2026-07-12T09:11:00.000Z',
      '2026-07-12T09:11:05.000Z',
      '2026-07-12T09:11:10.000Z',
      '2026-07-12T09:11:15.000Z',
      '2026-07-12T09:11:20.000Z',
      '2026-07-12T09:11:25.000Z',
      '2026-07-12T09:11:30.000Z',
      '2026-07-12T09:11:35.000Z',
      '2026-07-12T09:11:40.000Z',
      '2026-07-12T09:11:45.000Z',
      '2026-07-12T09:11:50.000Z',
      '2026-07-12T09:11:55.000Z',
      '2026-07-12T09:12:00.000Z',
      '2026-07-12T09:12:05.000Z',
      '2026-07-12T09:12:10.000Z',
      '2026-07-12T09:12:15.000Z',
      '2026-07-12T09:12:20.000Z',
      '2026-07-12T09:12:25.000Z',
      '2026-07-12T09:12:30.000Z',
    ]);
    const nodeCpuSeries = response.seedWindow.nodeMetrics.cpuUsagePct;
    const workloadCpuSeries =
      response.seedWindow.workloadMetrics['container-api'].cpuUsagePct;

    expect(nodeCpuSeries[nodeCpuSeries.length - 2]).toBe(70.1);
    expect(nodeCpuSeries[nodeCpuSeries.length - 1]).toBe(72.4);
    expect(workloadCpuSeries[workloadCpuSeries.length - 2]).toBe(40.2);
    expect(workloadCpuSeries[workloadCpuSeries.length - 1]).toBeNull();
  });
});

function createRepository(input: {
  workloads: NodeMetricsWorkloadRecord[];
  nodeBuckets: NodeMetricsNodeBucketRecord[];
  workloadBuckets: ReturnType<NodeMetricsReadRepository['listWorkloadSeedBuckets']> extends Promise<infer T> ? T : never;
  liveNodeBuckets?: NodeMetricsNodeBucketRecord[];
  liveWorkloadBuckets?: ReturnType<NodeMetricsReadRepository['listWorkloadLiveBuckets']> extends Promise<infer T> ? T : never;
}): NodeMetricsReadRepository {
  return {
    getCurrentNode: jest.fn().mockResolvedValue({
      nodeId: 'node-a1',
      summaryTs: '2026-07-12 09:12:30',
      cpuUsagePct: 84.1,
      memoryUsagePct: 76.8,
      diskUsagePct: 71.4,
      cpuTemperatureC: 81,
      networkRxBytesSec: 2510000,
      networkTxBytesSec: 1840000,
    }),
    listNodeWorkloads: jest.fn().mockResolvedValue(input.workloads),
    listNodeSeedBuckets: jest.fn().mockResolvedValue(input.nodeBuckets),
    listWorkloadSeedBuckets: jest.fn().mockResolvedValue(input.workloadBuckets),
    listNodeLiveBuckets: jest.fn().mockResolvedValue(input.liveNodeBuckets ?? []),
    listWorkloadLiveBuckets: jest.fn().mockResolvedValue(input.liveWorkloadBuckets ?? []),
    getLatestMetricsChangeSummaryTs: jest.fn(),
    listChangedNodeIdsSince: jest.fn(),
    listNodeIdsForMetricsSync: jest.fn(),
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
