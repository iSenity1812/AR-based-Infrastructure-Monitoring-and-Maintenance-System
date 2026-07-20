export const ALERT_CURRENT_STATE_SCOPE_TYPES = [
  'node',
  'rack',
  'workload',
  'service',
] as const;

export type AlertCurrentStateScopeType =
  (typeof ALERT_CURRENT_STATE_SCOPE_TYPES)[number];

export const ALERT_CURRENT_STATE_SEVERITIES = ['warning', 'critical'] as const;

export type AlertCurrentStateSeverity =
  (typeof ALERT_CURRENT_STATE_SEVERITIES)[number];

export const ALERT_CURRENT_STATE_STATUSES = ['firing', 'resolved'] as const;

export type AlertCurrentStateStatus =
  (typeof ALERT_CURRENT_STATE_STATUSES)[number];

export const ALERT_TRIAGE_STATUSES = [
  'new',
  'acknowledged',
  'incident_created',
  'suppressed',
] as const;

export type AlertTriageStatus = (typeof ALERT_TRIAGE_STATUSES)[number];

export const ALERT_INCIDENT_SEVERITIES = ['HIGH', 'CRITICAL'] as const;

export type AlertIncidentSeverity = (typeof ALERT_INCIDENT_SEVERITIES)[number];

export const ALERT_CURRENT_STATE_CATEGORIES = [
  'availability',
  'resource',
  'thermal',
  'runtime',
  'network',
  'connectivity',
] as const;

export type AlertCurrentStateCategory =
  (typeof ALERT_CURRENT_STATE_CATEGORIES)[number];

export type AlertCurrentStateScopeIdentity =
  | {
      scopeType: 'node';
      nodeId: string;
      rackId: string;
      workloadId?: never;
      serviceId?: never;
    }
  | {
      scopeType: 'rack';
      rackId: string;
      nodeId?: never;
      workloadId?: never;
      serviceId?: never;
    }
  | {
      scopeType: 'workload';
      workloadId: string;
      nodeId: string;
      rackId: string;
      serviceId?: never;
    }
  | {
      scopeType: 'service';
      serviceId: string;
      nodeId?: never;
      rackId?: never;
      workloadId?: never;
    };

export interface AlertIncidentLinkage {
  triageStatus: AlertTriageStatus;
  incidentId: string | null;
  incidentCode: string | null;
  incidentStatus: string | null;
  incidentSeverity: AlertIncidentSeverity | null;
  incidentTitle: string | null;
  incidentCreatedAt: string | null;
  incidentLinkedAt: string | null;
  lastEscalatedAt: string | null;
}

export type AlertCurrentState = AlertCurrentStateScopeIdentity & {
  fingerprint: string;
  alertName: string;
  rawLabels: Record<string, string>;
  rawAnnotations: Record<string, string>;
  severity: AlertCurrentStateSeverity;
  status: AlertCurrentStateStatus;
  category: AlertCurrentStateCategory;
  environment: string;
  team: string;
  source: 'grafana';
  summary: string;
  description: string;
  metricKey: string | null;
  observedWindow: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
  currentValue: string | null;
  threshold: string | null;
  startsAt: string;
  endsAt: string | null;
  lastReceivedAt: string;
  firstSyncedAt: string;
  lastSyncedAt: string;
  lastStatusChangedAt: string;
} & AlertIncidentLinkage;

export function createDefaultAlertIncidentLinkage(): AlertIncidentLinkage {
  return {
    triageStatus: 'new',
    incidentId: null,
    incidentCode: null,
    incidentStatus: null,
    incidentSeverity: null,
    incidentTitle: null,
    incidentCreatedAt: null,
    incidentLinkedAt: null,
    lastEscalatedAt: null,
  };
}
