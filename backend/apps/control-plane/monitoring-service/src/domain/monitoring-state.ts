export const MONITORING_SCOPE_TYPES = [
  'rack',
  'node',
  'service',
  'container',
] as const;

export type MonitoringScopeType = (typeof MONITORING_SCOPE_TYPES)[number];

export const NOTIFICATION_SYNC_STATUSES = [
  'idle',
  'pending_open',
  'open_synced',
  'pending_resolve',
  'resolve_synced',
  'sync_failed',
] as const;

export type NotificationSyncStatus =
  (typeof NOTIFICATION_SYNC_STATUSES)[number];

export const MONITORING_LIFECYCLE_STATUSES = [
  'active',
  'resolved',
] as const;

export type MonitoringLifecycleStatus =
  (typeof MONITORING_LIFECYCLE_STATUSES)[number];

export interface MonitoringState {
  scopeType: MonitoringScopeType;
  scopeId: string;
  scopeKey: string;
  fingerprint: string;
  severityCode: number;
  overrideFlag: boolean;
  lifecycleStatus: MonitoringLifecycleStatus;
  notificationSyncStatus: NotificationSyncStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  lastStateChangedAt: string;
  openedAt: string | null;
  resolvedAt: string | null;
  lastNotificationAttemptAt: string | null;
  lastNotificationSyncedAt: string | null;
}

export interface CreateMonitoringStateParams {
  scopeType: MonitoringScopeType;
  scopeId: string;
  fingerprint: string;
  severityCode: number;
  overrideFlag?: boolean;
  observedAt: string;
}

export function buildMonitoringScopeKey(
  scopeType: MonitoringScopeType,
  scopeId: string,
): string {
  return `${scopeType}:${scopeId}`;
}

export function deriveLifecycleStatus(
  severityCode: number,
): MonitoringLifecycleStatus {
  return severityCode > 0 ? 'active' : 'resolved';
}

export function deriveInitialNotificationSyncStatus(
  lifecycleStatus: MonitoringLifecycleStatus,
): NotificationSyncStatus {
  return lifecycleStatus === 'active' ? 'pending_open' : 'idle';
}

export function createMonitoringState(
  params: CreateMonitoringStateParams,
): MonitoringState {
  const lifecycleStatus = deriveLifecycleStatus(params.severityCode);
  const observedAt = params.observedAt;

  return {
    scopeType: params.scopeType,
    scopeId: params.scopeId,
    scopeKey: buildMonitoringScopeKey(params.scopeType, params.scopeId),
    fingerprint: params.fingerprint,
    severityCode: params.severityCode,
    overrideFlag: params.overrideFlag ?? false,
    lifecycleStatus,
    notificationSyncStatus:
      deriveInitialNotificationSyncStatus(lifecycleStatus),
    firstObservedAt: observedAt,
    lastObservedAt: observedAt,
    lastStateChangedAt: observedAt,
    openedAt: lifecycleStatus === 'active' ? observedAt : null,
    resolvedAt: lifecycleStatus === 'resolved' ? observedAt : null,
    lastNotificationAttemptAt: null,
    lastNotificationSyncedAt: null,
  };
}
