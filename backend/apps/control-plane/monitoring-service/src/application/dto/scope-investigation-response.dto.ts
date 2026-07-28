import type {
  IncidentObservedHardwareSnapshot,
  IncidentContextSourceRef,
} from '../services/incident-context-snapshot.contract';
import type { InvestigationInterval } from '../services/investigation-window-policy.service';

export interface ScopeInvestigationResponseView {
  generatedAt: string;
  scope: ScopeInvestigationScopeView;
  currentContext: ScopeInvestigationCurrentContextView;
  window: {
    from: string;
    to: string;
    interval: InvestigationInterval;
    pointCount: number;
  };
  metricSeries: ScopeInvestigationMetricSeriesView[];
  monitoringTimeline: ScopeInvestigationTimelineItemView[];
  sourceRefs: IncidentContextSourceRef[];
}

export type ScopeInvestigationScopeView =
  | {
      scopeType: 'node';
      scopeId: string;
      nodeId: string;
      nodeCode: string;
      displayName: string;
      rackId?: string;
      rackCode?: string;
      rackDisplayName?: string;
      siteCode?: string;
      roomCode?: string;
    }
  | {
      scopeType: 'rack';
      scopeId: string;
      rackId: string;
      rackCode: string;
      displayName: string;
      siteCode?: string;
      roomCode?: string;
    };

export interface ScopeInvestigationCurrentContextView {
  observedAt?: string;
  condition?: {
    healthCode?: number;
    operationalSeverityCode?: number;
    signalSeverityCode?: number;
    isStale?: boolean;
    lastHeartbeatAt?: string;
    staleAgeSec?: number;
    staleAfterSec?: number;
    policyVersion?: number;
    rackSeverityCode?: number;
    isRackLevelFailure?: boolean;
    hasSignalLoss?: boolean;
    worstMetric?: {
      metricKey: string;
      valueNumeric?: number;
      valueText?: string;
    };
  };
  impact?: {
    affectedNodeCount: number;
    totalNodeCount: number;
    affectedRatio: number;
    criticalNodeCount?: number;
    warningNodeCount?: number;
    staleNodeCount?: number;
    silentDeadNodeCount?: number;
  };
  observedHardware?: IncidentObservedHardwareSnapshot;
}

export interface ScopeInvestigationMetricSeriesView {
  metricKey: string;
  label?: string;
  unit?: string;
  points: Array<{
    timestamp: string;
    valueNumeric?: number | null;
    valueText?: string | null;
    severityCode?: number | null;
  }>;
}

export interface ScopeInvestigationTimelineItemView {
  id: string;
  occurredAt: string;
  category: 'monitoring' | 'alert' | 'incident' | 'ticket';
  type: string;
  data: Record<string, unknown>;
  source: string;
}
