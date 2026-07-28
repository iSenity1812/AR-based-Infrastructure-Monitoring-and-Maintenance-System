import type { RackContextRecord } from '../ports/rack-context.provider';
import type { RackMonitoringStateChangedEvent } from '../ports/monitoring-realtime.port';
import type { MonitoringTransition } from '../ports/monitoring-transition';
import { shouldEmitRackMonitoringStateChanged } from '../policies/rack-monitoring-realtime.policy';

export function mapTransitionToRackMonitoringStateChangedEvent(
  transition: MonitoringTransition,
  rackContext?: RackContextRecord,
): RackMonitoringStateChangedEvent | null {
  if (!shouldEmitRackMonitoringStateChanged(transition)) {
    return null;
  }

  const nextState = transition.nextState;
  const transitionKind = transition.transitionKind === 'resolve'
    ? 'resolve'
    : 'activate';

  return {
    scope: 'rack',
    view: 'monitoring_state_delta',
    rackId: transition.scopeId,
    rackName: rackContext?.displayName?.trim() || transition.scopeId,
    rackCode: rackContext?.rackCode || transition.scopeId,
    transitionKind,
    changedAt: nextState.lastStateChangedAt,
    operational: {
      severityCode: nextState.severityCode,
      overrideFlag: nextState.overrideFlag,
      lifecycleStatus: nextState.lifecycleStatus,
      fingerprint: nextState.fingerprint,
      firstObservedAt: nextState.firstObservedAt,
      lastObservedAt: nextState.lastObservedAt,
      lastStateChangedAt: nextState.lastStateChangedAt,
      openedAt: nextState.openedAt,
      resolvedAt: nextState.resolvedAt,
    },
    notification: {
      syncStatus: nextState.notificationSyncStatus,
      lastNotificationAttemptAt: nextState.lastNotificationAttemptAt,
      lastNotificationSyncedAt: nextState.lastNotificationSyncedAt,
    },
  };
}
