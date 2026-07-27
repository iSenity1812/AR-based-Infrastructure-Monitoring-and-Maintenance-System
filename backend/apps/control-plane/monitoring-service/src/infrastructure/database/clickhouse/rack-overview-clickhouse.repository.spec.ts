import { describe, expect, it, jest } from '@jest/globals';

import {
  RackOverviewClickhouseRepository,
  mapRackOverviewCurrentRackRow,
  mapRackOverviewHistoryRow,
  mapRackOverviewNodeSnapshotRow,
} from './rack-overview-clickhouse.repository';

describe('mapRackOverviewCurrentRackRow', () => {
  it('normalizes numeric ClickHouse JSON fields into application numbers', () => {
    const record = mapRackOverviewCurrentRackRow({
      rackId: 'rack-a1',
      summaryTs: '2026-07-01 10:15:00',
      rackSeverityCode: '3',
      hasOverrideFlag: '1',
      totalNodes: '24',
      badNodes: '13',
      criticalNodes: '5',
      warningNodes: '8',
      staleNodes: '2',
      silentDeadNodes: '1',
      badNodeRatio: '0.5417',
      isRackLevelFailure: '1',
      hasSignalLoss: '1',
      worstNodeId: 'node-17',
      worstMetricKey: 'cpu_usage_pct',
      worstMetricTagsJson: '{"host":"node-17"}',
      worstMetricValueNumeric: '98.4',
      worstMetricValueText: '98.4',
      avgCpuUsagePct: '71.2',
      avgMemoryUsedPct: '82.3',
      maxDiskUsedPct: '91.4',
      maxCpuTemperatureC: '88.5',
      sumNetworkRxBytesSec: '1024',
      sumNetworkTxBytesSec: '2048',
    });

    expect(record).toEqual({
      rackId: 'rack-a1',
      summaryTs: '2026-07-01 10:15:00',
      rackSeverityCode: 3,
      hasOverrideFlag: 1,
      totalNodes: 24,
      badNodes: 13,
      criticalNodes: 5,
      warningNodes: 8,
      staleNodes: 2,
      silentDeadNodes: 1,
      badNodeRatio: 0.5417,
      isRackLevelFailure: 1,
      hasSignalLoss: 1,
      worstNodeId: 'node-17',
      worstMetricKey: 'cpu_usage_pct',
      worstMetricTagsJson: '{"host":"node-17"}',
      worstMetricValueNumeric: 98.4,
      worstMetricValueText: '98.4',
      avgCpuUsagePct: 71.2,
      avgMemoryUsedPct: 82.3,
      maxDiskUsedPct: 91.4,
      maxCpuTemperatureC: 88.5,
      sumNetworkRxBytesSec: 1024,
      sumNetworkTxBytesSec: 2048,
    });
  });

  it('normalizes rack history rows into application history records', () => {
    const record = mapRackOverviewHistoryRow({
      bucketGranularity: '1m',
      bucketStart: '2026-07-01 10:14:00',
      rackId: 'rack-a1',
      summaryTs: '2026-07-01 10:14:30',
      rackSeverityCode: '2',
      hasOverrideFlag: '0',
      totalNodes: '24',
      badNodes: '4',
      criticalNodes: '1',
      warningNodes: '3',
      badNodeRatio: '0.1667',
      isRackLevelFailure: '0',
      worstNodeId: 'node-03',
      worstMetricKey: 'memory_used_pct',
      worstMetricTagsJson: '{"host":"node-03"}',
      worstMetricValueNumeric: '87.2',
      worstMetricValueText: '87.2',
    });

    expect(record).toEqual({
      bucketGranularity: '1m',
      bucketStart: '2026-07-01 10:14:00',
      rackId: 'rack-a1',
      summaryTs: '2026-07-01 10:14:30',
      rackSeverityCode: 2,
      hasOverrideFlag: 0,
      totalNodes: 24,
      badNodes: 4,
      criticalNodes: 1,
      warningNodes: 3,
      badNodeRatio: 0.1667,
      isRackLevelFailure: 0,
      worstNodeId: 'node-03',
      worstMetricKey: 'memory_used_pct',
      worstMetricTagsJson: '{"host":"node-03"}',
      worstMetricValueNumeric: 87.2,
      worstMetricValueText: '87.2',
    });
  });
});

describe('RackOverviewClickhouseRepository incremental polling', () => {
  it('queries changed rack rows with summary timestamp checkpoint ordering', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new RackOverviewClickhouseRepository({
      query,
    } as never);

    await repository.listCurrentRacksChangedSince('2026-07-07 10:15:00');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          changedSinceSummaryTs: '2026-07-07 10:15:00',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'summary_ts > parseDateTimeBestEffort({changedSinceSummaryTs: String})',
    );
    expect(query.mock.calls[0][0].query).toContain('summary_ts ASC');
    expect(query.mock.calls[0][0].query).toContain('rack_id ASC');
  });
});

describe('RackOverviewClickhouseRepository rack investigation queries', () => {
  it('queries one current rack by rack id', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new RackOverviewClickhouseRepository({
      query,
    } as never);

    await repository.getCurrentRack('rack-a1');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          rackId: 'rack-a1',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'rack_id = {rackId: String}',
    );
    expect(query.mock.calls[0][0].query).toContain('LIMIT 1');
  });

  it('queries recent rack history scoped to one rack id', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new RackOverviewClickhouseRepository({
      query,
    } as never);

    await repository.listRecentRackHistoryByRackId('rack-a1');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          rackId: 'rack-a1',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'rack_id = {rackId: String}',
    );
    expect(query.mock.calls[0][0].query).toContain(
      "bucket_granularity IN ('1m', '5m')",
    );
  });

  it('queries a problem-first limited node snapshot for one rack id', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new RackOverviewClickhouseRepository({
      query,
    } as never);

    await repository.listRackNodeSnapshot('rack-a1', 5);

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          rackId: 'rack-a1',
          limit: 5,
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.node_current_summary',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'rack_id = {rackId: String}',
    );
    expect(query.mock.calls[0][0].query).toContain('LIMIT {limit: UInt32}');
  });
});

describe('mapRackOverviewNodeSnapshotRow', () => {
  it('normalizes compact node snapshot rows for rack investigation', () => {
    const record = mapRackOverviewNodeSnapshotRow({
      nodeId: 'node-a1',
      summaryTs: '2026-07-01 10:15:00',
      maxSeverityCode: '4',
      hasOverrideFlag: '1',
      isAnyStale: '0',
      staleMetricCount: '0',
      criticalMetricCount: '2',
      warningMetricCount: '1',
      cpuUsagePctCurrent: '98.4',
      memoryUsagePctCurrent: '83.2',
      diskUsagePctCurrent: '71.5',
      cpuTemperatureCCurrent: '92.7',
      worstMetricKey: 'cpu_usage_pct',
      worstMetricValueNumeric: '98.4',
      worstMetricValueText: '98.4',
    });

    expect(record).toEqual({
      nodeId: 'node-a1',
      summaryTs: '2026-07-01 10:15:00',
      maxSeverityCode: 4,
      hasOverrideFlag: 1,
      isAnyStale: 0,
      staleMetricCount: 0,
      criticalMetricCount: 2,
      warningMetricCount: 1,
      cpuUsagePctCurrent: 98.4,
      memoryUsagePctCurrent: 83.2,
      diskUsagePctCurrent: 71.5,
      cpuTemperatureCCurrent: 92.7,
      worstMetricKey: 'cpu_usage_pct',
      worstMetricValueNumeric: 98.4,
      worstMetricValueText: '98.4',
    });
  });
});
