import { describe, expect, it } from '@jest/globals';

import type { RackOverviewCurrentRackRecord } from '../ports/rack-overview-read.repository';
import { mapRackOverviewRecordToSummaryRuleInput } from './rack-summary-rule.mapper';

describe('rack-summary-rule mapper', () => {
  it('maps a rack overview row into rack summary rule input while preserving monitoring semantics', () => {
    const record: RackOverviewCurrentRackRecord = {
      rackId: 'rack-a1',
      summaryTs: '2026-07-07 10:15:00',
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
    };

    const result = mapRackOverviewRecordToSummaryRuleInput(record);

    expect(result).toMatchObject({
      summarySource: 'rack_current_summary',
      scopeType: 'rack',
      scopeId: 'rack-a1',
      observedAt: '2026-07-07 10:15:00',
      severityCode: 3,
      overrideFlag: true,
      culprit: {
        entityId: 'node-17',
        metricKey: 'cpu_usage_pct',
        metricTagsJson: '{"host":"node-17"}',
        metricValueNumeric: 98.4,
        metricValueText: '98.4',
      },
    });
    expect(result?.evidence.numericIndicators).toMatchObject({
      totalNodes: 24,
      badNodes: 13,
      criticalNodes: 5,
      warningNodes: 8,
      staleNodes: 2,
      silentDeadNodes: 1,
      badNodeRatio: 0.5417,
    });
    expect(result?.evidence.booleanIndicators).toMatchObject({
      isRackLevelFailure: true,
      hasSignalLoss: true,
    });
  });

  it('filters placeholder rack ids out of monitoring mapping', () => {
    const record: RackOverviewCurrentRackRecord = {
      rackId: 'null',
      summaryTs: '2026-07-07 10:16:00',
      rackSeverityCode: 0,
      hasOverrideFlag: 0,
      totalNodes: 1,
      badNodes: 0,
      criticalNodes: 0,
      warningNodes: 0,
      staleNodes: 0,
      silentDeadNodes: 0,
      badNodeRatio: 0,
      isRackLevelFailure: 0,
      hasSignalLoss: 0,
      worstNodeId: '',
      worstMetricKey: '',
      worstMetricTagsJson: '',
      worstMetricValueNumeric: 0,
      worstMetricValueText: '',
    };

    expect(mapRackOverviewRecordToSummaryRuleInput(record)).toBeNull();
  });

  it('normalizes empty culprit text fields to null without adding enrichment concerns', () => {
    const record: RackOverviewCurrentRackRecord = {
      rackId: 'rack-b2',
      summaryTs: '2026-07-07 10:17:00',
      rackSeverityCode: 2,
      hasOverrideFlag: 0,
      totalNodes: 12,
      badNodes: 2,
      criticalNodes: 0,
      warningNodes: 2,
      staleNodes: 0,
      silentDeadNodes: 0,
      badNodeRatio: 0.1667,
      isRackLevelFailure: 0,
      hasSignalLoss: 0,
      worstNodeId: '  ',
      worstMetricKey: 'memory_usage_pct',
      worstMetricTagsJson: '   ',
      worstMetricValueNumeric: 85.5,
      worstMetricValueText: '   ',
    };

    const result = mapRackOverviewRecordToSummaryRuleInput(record);

    expect(result?.culprit).toMatchObject({
      entityId: null,
      metricKey: 'memory_usage_pct',
      metricTagsJson: null,
      metricValueNumeric: 85.5,
      metricValueText: null,
    });
  });
});
