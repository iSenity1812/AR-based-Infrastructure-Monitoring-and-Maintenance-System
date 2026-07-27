export type MonitoringTimelineCategory = 'monitoring' | 'alert';

export type MonitoringTimelineSource =
  | 'monitoring-service'
  | 'external-alert-sync'
  | 'node-liveness-sync';

export interface MonitoringEvent {
  eventKey: string;
  occurredAt: string;
  category: MonitoringTimelineCategory;
  type: string;
  scopeType: 'node' | 'rack';
  scopeId: string;
  nodeId?: string | null;
  rackId?: string | null;
  fingerprint?: string | null;
  incidentCode?: string | null;
  source: MonitoringTimelineSource;
  data: Record<string, unknown>;
  createdAt?: string;
}

export interface AppendMonitoringEventResult {
  inserted: boolean;
}

export abstract class MonitoringEventRepository {
  abstract append(
    event: MonitoringEvent,
  ): Promise<AppendMonitoringEventResult>;

  abstract listByScopeAndWindow(input: {
    scopeType: 'node' | 'rack';
    scopeId: string;
    from: string;
    to: string;
  }): Promise<MonitoringEvent[]>;
}
