import { describe, expect, it, jest } from '@jest/globals';

import {
  NodeMetricsClickhouseRepository,
  mapNodeMetricsNodeBucketRow,
  mapNodeMetricsWorkloadBucketRow,
  mapNodeMetricsWorkloadRow,
} from './node-metrics-clickhouse.repository';

describe('node metrics ClickHouse mappers', () => {
  it('normalizes current workload rows for metrics selection', () => {
    expect(
      mapNodeMetricsWorkloadRow({
        workloadId: 'container-api',
        workloadType: 'container',
        summaryTs: '2026-07-12 09:12:30',
        nodeId: 'node-a1',
        name: 'api',
        status: 'running',
        healthStatus: 'healthy',
        cpuUsagePct: '46.1',
        memoryUsagePct: null,
        restartCount: '2',
      }),
    ).toEqual({
      workloadId: 'container-api',
      workloadType: 'container',
      summaryTs: '2026-07-12 09:12:30',
      nodeId: 'node-a1',
      name: 'api',
      status: 'running',
      healthStatus: 'healthy',
      cpuUsagePct: 46.1,
      memoryUsagePct: null,
      restartCount: 2,
    });
  });

  it('normalizes node and workload bucket metrics with nullable numbers', () => {
    expect(
      mapNodeMetricsNodeBucketRow({
        ts: '2026-07-12 09:12:00',
        nodeId: 'node-a1',
        cpuUsagePct: '79.1',
        memoryUsagePct: '',
        diskUsagePct: '71.4',
        cpuTemperatureC: '78.8',
        networkRxBytesSec: '2210000',
        networkTxBytesSec: null,
      }),
    ).toEqual(
      expect.objectContaining({
        cpuUsagePct: 79.1,
        memoryUsagePct: null,
        networkTxBytesSec: null,
      }),
    );

    expect(
      mapNodeMetricsWorkloadBucketRow({
        ts: '2026-07-12 09:12:00',
        workloadId: 'container-api',
        nodeId: 'node-a1',
        cpuUsagePct: '42.8',
        memoryUsagePct: '37.9',
      }),
    ).toEqual(
      expect.objectContaining({
        workloadId: 'container-api',
        cpuUsagePct: 42.8,
        memoryUsagePct: 37.9,
      }),
    );
  });
});

describe('NodeMetricsClickhouseRepository', () => {
  it('queries seed buckets from node and container 1 minute trend views', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new NodeMetricsClickhouseRepository({ query } as never);
    const window = {
      fromTs: '2026-07-12T09:00:00.000Z',
      toTs: '2026-07-12T09:15:00.000Z',
      resolutionSec: 60,
    };

    await repository.listNodeSeedBuckets('node-a1', window);
    await repository.listWorkloadSeedBuckets('node-a1', ['container-api'], window);

    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.node_summary_trend_1m',
    );
    expect(query.mock.calls[1][0].query).toContain(
      'FROM telemetry_db.container_summary_trend_1m',
    );
  });
});
