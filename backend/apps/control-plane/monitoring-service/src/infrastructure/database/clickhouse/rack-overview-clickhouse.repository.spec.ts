import { describe, expect, it } from '@jest/globals';

import {
  mapRackOverviewCurrentRackRow,
  mapRackOverviewHistoryRow,
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
