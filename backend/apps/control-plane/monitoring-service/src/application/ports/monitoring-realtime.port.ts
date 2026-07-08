import type {
  MonitoringLifecycleStatus,
  NotificationSyncStatus,
} from '../../domain/monitoring-state';
import type { MonitoringTransitionKind } from './monitoring-transition';

// Realtime is a delta channel for UI patching only.
// REST snapshot endpoints remain the initial load and resync source of truth.
export interface RackMonitoringStateChangedEvent {
  scope: 'rack';
  view: 'monitoring_state_delta';
  rackId: string;
  rackName: string;
  rackCode: string;
  transitionKind: Extract<MonitoringTransitionKind, 'activate' | 'resolve'>;
  changedAt: string;
  operational: {
    severityCode: number;
    overrideFlag: boolean;
    lifecycleStatus: MonitoringLifecycleStatus;
    fingerprint: string;
    firstObservedAt: string;
    lastObservedAt: string;
    lastStateChangedAt: string;
    openedAt: string | null;
    resolvedAt: string | null;
  };
  notification: {
    syncStatus: NotificationSyncStatus;
    lastNotificationAttemptAt: string | null;
    lastNotificationSyncedAt: string | null;
  };
}

export abstract class MonitoringRealtimePort {
  abstract emitRackStateChanged(
    payload: RackMonitoringStateChangedEvent,
  ): Promise<void>;
}
