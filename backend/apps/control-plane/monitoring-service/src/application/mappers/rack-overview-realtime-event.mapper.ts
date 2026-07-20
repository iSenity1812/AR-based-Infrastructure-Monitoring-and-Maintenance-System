import type { RackContextRecord } from '../ports/rack-context.provider';
import type {
  RackOverviewRealtimeUpdatedEvent,
} from '../ports/monitoring-realtime.port';
import type { MonitoringTransition } from '../ports/monitoring-transition';
import { shouldEmitRackMonitoringStateChanged } from '../policies/rack-monitoring-realtime.policy';

export function mapTransitionToRackOverviewRealtimeEvent(
  transition: MonitoringTransition,
  rackContext?: RackContextRecord,
): RackOverviewRealtimeUpdatedEvent | null {
  if (!shouldEmitRackMonitoringStateChanged(transition)) {
    return null;
  }

  const nextState = transition.nextState;
  const lastStateChangedAt = new Date(nextState.lastStateChangedAt).getTime();
  const lastChangeAgeSec = Number.isFinite(lastStateChangedAt)
    ? Math.max(0, Math.floor((Date.now() - lastStateChangedAt) / 1000))
    : null;

  return {
    event: 'monitoring.rack.overview.updated',
    scope: 'rack',
    view: 'operator_dashboard',
    rack: {
      id: transition.scopeId,
      name: rackContext?.displayName?.trim() || transition.scopeId,
      code: rackContext?.rackCode?.trim() || transition.scopeId,
    },
    status: {
      severity: toSeverityLabel(nextState.severityCode),
      override: nextState.overrideFlag,
      rackLevelFailure: toBooleanIndicator(
        transition.evidence.booleanIndicators.isRackLevelFailure,
      ),
      signalLoss: toBooleanIndicator(
        transition.evidence.booleanIndicators.hasSignalLoss,
      ),
      staleNodes: toNumberIndicator(transition.evidence.numericIndicators.staleNodes),
    },
    metrics: {
      totalNodes: toNumberIndicator(transition.evidence.numericIndicators.totalNodes),
      badNodes: toNumberIndicator(transition.evidence.numericIndicators.badNodes),
      criticalNodes: toNumberIndicator(transition.evidence.numericIndicators.criticalNodes),
      warningNodes: toNumberIndicator(transition.evidence.numericIndicators.warningNodes),
      badNodeRatio: toNumberIndicator(transition.evidence.numericIndicators.badNodeRatio),
    },
    culprit: {
      nodeId: normalizeText(transition.culprit.entityId) || transition.scopeId,
      metric: {
        key: normalizeText(transition.culprit.metricKey) || '',
        tags: parseMetricTagsJson(transition.culprit.metricTagsJson),
        value: {
          numeric: transition.culprit.metricValueNumeric ?? 0,
          text:
            normalizeText(transition.culprit.metricValueText) ||
            String(transition.culprit.metricValueNumeric ?? 0),
        },
      },
    },
    trend: {
      delta1m: 0,
      delta5m: 0,
      lastChangeAgeSec,
    },
    updatedAt: nextState.lastStateChangedAt,
    location: {
      site: rackContext?.siteCode?.trim() || undefined,
      room: rackContext?.roomCode?.trim() || undefined,
      zone: rackContext?.zoneCode?.trim() || undefined,
      row: rackContext?.rowCode?.trim() || undefined,
      position: rackContext?.positionCode?.trim() || undefined,
    },
  };
}

function toBooleanIndicator(value: boolean): boolean {
  return value;
}

function toNumberIndicator(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseMetricTagsJson(value: string | null): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }

  const normalized = value.trim();
  if (!normalized) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(normalized);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}

function toSeverityLabel(value: number): 'normal' | 'warning' | 'critical' {
  if (value >= 3) {
    return 'critical';
  }

  if (value >= 2) {
    return 'warning';
  }

  return 'normal';
}
