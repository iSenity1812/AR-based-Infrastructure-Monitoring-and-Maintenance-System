import type { MonitoringState } from '../../domain/monitoring-state';
import type {
  AlertDeliveryCommand,
  MonitoringTransition,
} from '../ports/monitoring-transition';

export function mapMonitoringTransitionToAlertDeliveryCommand(
  transition: MonitoringTransition,
): AlertDeliveryCommand | null {
  if (
    transition.transitionKind !== 'activate' &&
    transition.transitionKind !== 'resolve'
  ) {
    return null;
  }

  return {
    transitionKind: transition.transitionKind,
    summarySource: transition.summarySource,
    scopeType: transition.scopeType,
    scopeId: transition.scopeId,
    scopeKey: transition.scopeKey,
    observedAt: transition.observedAt,
    startsAt: deriveStartsAt(transition),
    endsAt: deriveEndsAt(transition),
    severityCode: transition.severityCode,
    overrideFlag: transition.overrideFlag,
    lifecycleStatus: transition.lifecycleStatus,
    fingerprint: transition.fingerprint,
    culprit: transition.culprit,
    evidence: transition.evidence,
  };
}

function deriveStartsAt(transition: MonitoringTransition): string | null {
  if (transition.transitionKind !== 'activate') {
    return transition.nextState.openedAt;
  }

  return transition.nextState.openedAt ?? transition.observedAt;
}

function deriveEndsAt(transition: MonitoringTransition): string | null {
  if (transition.transitionKind !== 'resolve') {
    return null;
  }

  return transition.nextState.resolvedAt ?? transition.observedAt;
}

export function applyAlertDeliveryResultToState(
  state: MonitoringState,
  result: {
    deliveredAt: string | null;
    syncStatus: MonitoringState['notificationSyncStatus'];
  },
  attemptedAt: string,
): MonitoringState {
  return {
    ...state,
    notificationSyncStatus: result.syncStatus,
    lastNotificationAttemptAt: attemptedAt,
    lastNotificationSyncedAt: result.deliveredAt,
  };
}
