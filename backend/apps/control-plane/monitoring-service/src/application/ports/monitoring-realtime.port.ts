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

export interface NodeMetricsUpdatedEvent {
  event: 'monitoring.node.metrics.updated';
  nodeId: string;
  ts: string;
  bucketSec: 60;
  node: {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    diskUsagePct: number | null;
    cpuTemperatureC: number | null;
    networkRxBytesSec: number | null;
    networkTxBytesSec: number | null;
  };
  workloads: Array<{
    workloadId: string;
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
  }>;
}

export interface NodeMetricsWorkloadsChangedEvent {
  event: 'monitoring.node.metrics.workloads.changed';
  nodeId: string;
  ts: string;
  workloadSummary: {
    total: number;
    returned: number;
    selectionMode:
      | 'top_cpu_then_memory'
      | 'top_memory_then_cpu'
      | 'abnormal_first_then_top_cpu'
      | 'abnormal_only'
      | 'pinned_workloads'
      | 'manual_ids';
  };
  workloads: Array<{
    workloadId: string;
    workloadType: 'container';
    name: string;
    status: string;
    latestCpuUsagePct: number | null;
    latestMemoryUsagePct: number | null;
  }>;
}

export abstract class MonitoringRealtimePort {
  abstract emitRackStateChanged(
    payload: RackMonitoringStateChangedEvent,
  ): Promise<void>;

  abstract emitNodeOverviewUpdated(
    payload: NodeOverviewRealtimeUpdatedEvent,
  ): Promise<void>;

  abstract emitNodeMetricsUpdated(
    payload: NodeMetricsUpdatedEvent,
  ): Promise<void>;

  abstract emitNodeMetricsWorkloadsChanged(
    payload: NodeMetricsWorkloadsChangedEvent,
  ): Promise<void>;
}
