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

export interface RackOverviewRealtimeUpdatedEvent {
  event: 'monitoring.rack.overview.updated';
  scope: 'rack';
  view: 'operator_dashboard';
  rack: {
    id: string;
    name: string;
    code: string;
  };
  status: {
    severity: 'normal' | 'warning' | 'critical';
    override: boolean;
    rackLevelFailure: boolean;
    signalLoss: boolean;
    staleNodes: number;
  };
  metrics: {
    totalNodes: number;
    badNodes: number;
    criticalNodes: number;
    warningNodes: number;
    badNodeRatio: number;
  };
  culprit: {
    nodeId: string;
    metric: {
      key: string;
      tags: Record<string, unknown>;
      value: {
        numeric: number;
        text: string;
      };
    };
  };
  trend: {
    delta1m: number;
    delta5m: number;
    lastChangeAgeSec: number | null;
  };
  updatedAt: string;
  location: {
    site?: string;
    room?: string;
    zone?: string;
    row?: string;
    position?: string;
  };
}

export interface NodeOverviewChangedEvent {
  event: 'monitoring.node.overview.changed';
  nodeId: string;
  channel: string;
  changedAt: string;
  fingerprint: string;
}

export interface NodeMetricsUpdatedEvent {
  event: 'monitoring.node.metrics.updated';
  nodeId: string;
  channel: string;
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
  workloads: Record<string, {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
  }>;
}

export interface NodeMetricsWorkloadsChangedEvent {
  event: 'monitoring.node.metrics.workloads.changed';
  nodeId: string;
  channel: string;
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

  abstract emitRackOverviewUpdated(
    payload: RackOverviewRealtimeUpdatedEvent,
  ): Promise<void>;

  abstract emitNodeOverviewChanged(
    payload: NodeOverviewChangedEvent,
  ): Promise<void>;

  abstract emitNodeMetricsUpdated(
    payload: NodeMetricsUpdatedEvent,
  ): Promise<void>;

  abstract emitNodeMetricsWorkloadsChanged(
    payload: NodeMetricsWorkloadsChangedEvent,
  ): Promise<void>;
}
