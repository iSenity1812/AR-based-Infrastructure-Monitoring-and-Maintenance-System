import { describe, expect, it, jest } from '@jest/globals';

import {
  NodeOverviewClickhouseRepository,
  mapNodeOverviewSnapshotRow,
  mapNodeOverviewWorkloadRow,
} from './node-overview-clickhouse.repository';

describe('mapNodeOverviewSnapshotRow', () => {
  it('normalizes nullable numeric ClickHouse fields for node overview snapshots', () => {
    const record = mapNodeOverviewSnapshotRow({
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      maxSeverityCode: '3',
      hasOverrideFlag: '1',
      isAnyStale: '0',
      staleMetricCount: '0',
      criticalMetricCount: '2',
      warningMetricCount: '1',
      cpuUsagePctCurrent: '80.2',
      memoryUsagePctCurrent: null,
      diskUsagePctCurrent: '75.1',
      cpuTemperatureCCurrent: '92',
      networkRxBytesSecCurrent: '12.5',
      networkTxBytesSecCurrent: '6.3',
      primaryNicStatusCurrent: 'dormant',
      worstMetricKey: 'node.cpu_temperature_c',
      worstMetricValueNumeric: '92',
      worstMetricValueText: '92',
    });

    expect(record).toEqual({
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      maxSeverityCode: 3,
      hasOverrideFlag: 1,
      isAnyStale: 0,
      staleMetricCount: 0,
      criticalMetricCount: 2,
      warningMetricCount: 1,
      cpuUsagePctCurrent: 80.2,
      memoryUsagePctCurrent: null,
      diskUsagePctCurrent: 75.1,
      cpuTemperatureCCurrent: 92,
      networkRxBytesSecCurrent: 12.5,
      networkTxBytesSecCurrent: 6.3,
      primaryNicStatusCurrent: 'dormant',
      worstMetricKey: 'node.cpu_temperature_c',
      worstMetricValueNumeric: 92,
      worstMetricValueText: '92',
    });
  });
});

describe('mapNodeOverviewWorkloadRow', () => {
  it('normalizes workload rows for overview ranking and presentation', () => {
    const record = mapNodeOverviewWorkloadRow({
      workloadId: 'container-1',
      workloadType: 'container',
      summaryTs: '2026-07-10 10:00:00',
      nodeId: 'node-a1',
      name: 'vector',
      serviceName: 'vector',
      status: 'running',
      healthStatus: 'unhealthy',
      cpuUsagePct: '12.3',
      memoryUsagePct: '4.5',
      restartCount: '2',
      pidCount: '11',
      worstMetricKey: 'container.health_status',
      isAnyStale: '0',
    });

    expect(record).toEqual({
      workloadId: 'container-1',
      workloadType: 'container',
      summaryTs: '2026-07-10 10:00:00',
      nodeId: 'node-a1',
      name: 'vector',
      serviceName: 'vector',
      status: 'running',
      healthStatus: 'unhealthy',
      cpuUsagePct: 12.3,
      memoryUsagePct: 4.5,
      restartCount: 2,
      pidCount: 11,
      worstMetricKey: 'container.health_status',
      isAnyStale: 0,
    });
  });
});

describe('NodeOverviewClickhouseRepository incremental change detection', () => {
  it('queries changed node ids across node and workload summaries with checkpoint ordering', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new NodeOverviewClickhouseRepository({
      query,
    } as never);

    await repository.listChangedNodeIdsSince('2026-07-10 10:00:00');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          changedSinceSummaryTs: '2026-07-10 10:00:00',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.node_current_summary',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.container_current_summary',
    );
  });
});
