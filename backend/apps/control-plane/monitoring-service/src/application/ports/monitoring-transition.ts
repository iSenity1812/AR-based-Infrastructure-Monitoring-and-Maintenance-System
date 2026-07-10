import type {
  MonitoringLifecycleStatus,
  MonitoringScopeType,
  MonitoringState,
  NotificationSyncStatus,
} from '../../domain/monitoring-state';
import type {
  SummaryRuleCandidateIntent,
  SummaryRuleCulpritRef,
  SummaryRuleEvidence,
  SummaryRuleSource,
} from '../../domain/summary-rule';

export const MONITORING_TRANSITION_KINDS = [
  'activate',
  'repeated_active',
  'resolve',
  'noop',
] as const;

export type MonitoringTransitionKind =
  (typeof MONITORING_TRANSITION_KINDS)[number];

export interface MonitoringTransition {
  transitionKind: MonitoringTransitionKind;
  summarySource: SummaryRuleSource;
  scopeType: MonitoringScopeType;
  scopeId: string;
  scopeKey: string;
  observedAt: string;
  severityCode: number;
  overrideFlag: boolean;
  lifecycleStatus: MonitoringLifecycleStatus;
  candidateIntent: SummaryRuleCandidateIntent;
  fingerprint: string;
  culprit: SummaryRuleCulpritRef;
  evidence: SummaryRuleEvidence;
  previousState: MonitoringState | null;
  nextState: MonitoringState;
}

export interface AlertDeliveryCommand {
  transitionKind: Exclude<MonitoringTransitionKind, 'noop'>;
  summarySource: SummaryRuleSource;
  scopeType: MonitoringScopeType;
  scopeId: string;
  scopeKey: string;
  observedAt: string;
  severityCode: number;
  overrideFlag: boolean;
  lifecycleStatus: MonitoringLifecycleStatus;
  fingerprint: string;
  culprit: SummaryRuleCulpritRef;
  evidence: SummaryRuleEvidence;
}

export interface AlertDeliveryResult {
  deliveryStatus: 'delivered' | 'failed';
  deliveredAt: string | null;
  syncStatus: NotificationSyncStatus;
  errorMessage?: string;
}
