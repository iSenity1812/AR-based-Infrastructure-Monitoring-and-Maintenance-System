import type { RackOverviewCurrentRackRecord } from '../ports/rack-overview-read.repository';
import {
  type RackSummaryRuleInput,
  createRackSummaryRuleInput,
} from '../../domain/summary-rule';

export function mapRackOverviewRecordToSummaryRuleInput(
  record: RackOverviewCurrentRackRecord,
): RackSummaryRuleInput | null {
  if (!isUsableRackId(record.rackId)) {
    return null;
  }

  return createRackSummaryRuleInput({
    rackId: record.rackId,
    observedAt: record.summaryTs,
    severityCode: record.rackSeverityCode,
    overrideFlag: toBooleanFlag(record.hasOverrideFlag),
    culprit: {
      entityId: normalizeNullableText(record.worstNodeId),
      metricKey: normalizeNullableText(record.worstMetricKey),
      metricTagsJson: normalizeNullableText(record.worstMetricTagsJson),
      metricValueNumeric: record.worstMetricValueNumeric,
      metricValueText: normalizeNullableText(record.worstMetricValueText),
    },
    evidence: {
      numericIndicators: {
        totalNodes: record.totalNodes,
        badNodes: record.badNodes,
        criticalNodes: record.criticalNodes,
        warningNodes: record.warningNodes,
        staleNodes: record.staleNodes,
        silentDeadNodes: record.silentDeadNodes,
        badNodeRatio: record.badNodeRatio,
      },
      booleanIndicators: {
        isRackLevelFailure: toBooleanFlag(record.isRackLevelFailure),
        hasSignalLoss: toBooleanFlag(record.hasSignalLoss),
      },
    },
  });
}

function toBooleanFlag(value: number): boolean {
  return value >= 1;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isUsableRackId(rackId: string | null | undefined): rackId is string {
  if (typeof rackId !== 'string') {
    return false;
  }

  const normalized = rackId.trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined';
}
