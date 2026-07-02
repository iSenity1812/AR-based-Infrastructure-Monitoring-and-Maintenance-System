import { describe, expect, it } from '@jest/globals';

import type {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
} from '../ports/rack-overview-read.repository';
import { buildRackOverviewHistoryEnrichment } from './rack-overview-history-enrichment';

describe('buildRackOverviewHistoryEnrichment', () => {
  const generatedAt = new Date('2026-07-02T10:15:45.000Z');

  const rack: RackOverviewCurrentRackRecord = {
    rackId: 'rack-a1',
    summaryTs: '2026-07-02T10:15:30.000Z',
    rackSeverityCode: 3,
    hasOverrideFlag: 1,
    totalNodes: 24,
    badNodes: 12,
    criticalNodes: 4,
    warningNodes: 8,
    staleNodes: 1,
    silentDeadNodes: 0,
    badNodeRatio: 0.5,
    isRackLevelFailure: 0,
    hasSignalLoss: 0,
    worstNodeId: 'node-17',
    worstMetricKey: 'cpu_usage_pct',
    worstMetricTagsJson: '{"host":"node-17"}',
    worstMetricValueNumeric: 98.4,
    worstMetricValueText: '98.4',
  };

  it('returns safe defaults when no history exists', () => {
    expect(
      buildRackOverviewHistoryEnrichment(rack, [], generatedAt),
    ).toEqual({
      severityTrendDelta1m: 0,
      severityTrendDelta5m: 0,
      lastChangeAgeSec: null,
    });
  });

  it('computes worsening deltas from previous 1m and 5m buckets', () => {
    const history: RackOverviewHistoryRecord[] = [
      buildHistoryRow('1m', '2026-07-02T10:14:00.000Z', 2),
      buildHistoryRow('5m', '2026-07-02T10:10:00.000Z', 1),
    ];

    expect(
      buildRackOverviewHistoryEnrichment(rack, history, generatedAt),
    ).toEqual({
      severityTrendDelta1m: 1,
      severityTrendDelta5m: 2,
      lastChangeAgeSec: 105,
    });
  });

  it('computes recovering deltas when previous buckets were worse', () => {
    const recoveredRack = { ...rack, rackSeverityCode: 2 };
    const history: RackOverviewHistoryRecord[] = [
      buildHistoryRow('1m', '2026-07-02T10:14:00.000Z', 3),
      buildHistoryRow('5m', '2026-07-02T10:10:00.000Z', 3),
      buildHistoryRow('1m', '2026-07-02T10:13:00.000Z', 2),
    ];

    expect(
      buildRackOverviewHistoryEnrichment(recoveredRack, history, generatedAt),
    ).toEqual({
      severityTrendDelta1m: -1,
      severityTrendDelta5m: -1,
      lastChangeAgeSec: 165,
    });
  });

  it('tracks the age of an unchanged severity streak across contiguous 1m buckets', () => {
    const history: RackOverviewHistoryRecord[] = [
      buildHistoryRow('1m', '2026-07-02T10:14:00.000Z', 3),
      buildHistoryRow('1m', '2026-07-02T10:13:00.000Z', 3),
      buildHistoryRow('1m', '2026-07-02T10:12:00.000Z', 3),
      buildHistoryRow('1m', '2026-07-02T10:11:00.000Z', 2),
      buildHistoryRow('5m', '2026-07-02T10:10:00.000Z', 3),
    ];

    expect(
      buildRackOverviewHistoryEnrichment(rack, history, generatedAt),
    ).toEqual({
      severityTrendDelta1m: 0,
      severityTrendDelta5m: 0,
      lastChangeAgeSec: 225,
    });
  });
});

function buildHistoryRow(
  bucketGranularity: '1m' | '5m',
  bucketStart: string,
  rackSeverityCode: number,
): RackOverviewHistoryRecord {
  return {
    bucketGranularity,
    bucketStart,
    rackId: 'rack-a1',
    summaryTs: bucketStart,
    rackSeverityCode,
    hasOverrideFlag: 0,
    totalNodes: 24,
    badNodes: rackSeverityCode >= 2 ? 4 : 0,
    criticalNodes: rackSeverityCode === 3 ? 1 : 0,
    warningNodes: rackSeverityCode === 2 ? 3 : 0,
    badNodeRatio: rackSeverityCode >= 2 ? 0.1667 : 0,
    isRackLevelFailure: 0,
    worstNodeId: 'node-03',
    worstMetricKey: 'cpu_usage_pct',
    worstMetricTagsJson: '{"host":"node-03"}',
    worstMetricValueNumeric: 87.2,
    worstMetricValueText: '87.2',
  };
}
