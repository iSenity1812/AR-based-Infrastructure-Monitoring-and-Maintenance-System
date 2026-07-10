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

export interface NodeOverviewRealtimeUpdatedEvent {
  nodeId: string;
  emittedAt: string;
  node: {
    nodeId: string;
    status: 'healthy' | 'alerting' | 'unknown';
    severity: 'none' | 'low' | 'medium' | 'high' | 'unknown';
    lastSeenAt: string;
    freshnessSec: number;
  };
  summaryMetrics: {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    diskUsagePct: number | null;
    cpuTemperatureC: number | null;
    networkRxBytesSec: number | null;
    networkTxBytesSec: number | null;
    primaryNicStatus: string | null;
    worstMetric: {
      metricKey: string | null;
      metricValueNumeric: number | null;
      metricValueText: string | null;
    };
    alertCounters: {
      criticalMetricCount: number;
      warningMetricCount: number;
      staleMetricCount: number;
    };
  };
  workloadSummary: {
    total: number;
    unhealthy: number;
    nonRunning: number;
    highCpu: number;
    highMemory: number;
    returned: number;
    selectionMode: 'abnormal_first_then_top_cpu';
  };
  workloads: Array<{
    workloadId: string;
    workloadType: 'container';
    name: string;
    serviceName: string;
    status: string;
    healthStatus: string;
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    restartCount: number;
    pidCount: number;
    worstMetricKey: string | null;
    isAbnormal: boolean;
  }>;
}

export abstract class MonitoringRealtimePort {
  abstract emitRackStateChanged(
    payload: RackMonitoringStateChangedEvent,
  ): Promise<void>;

  abstract emitNodeOverviewUpdated(
    payload: NodeOverviewRealtimeUpdatedEvent,
  ): Promise<void>;
}
