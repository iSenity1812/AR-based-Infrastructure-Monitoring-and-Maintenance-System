import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';

export interface IncidentCreatedBy {
  userId: string;
  username: string;
  fullName?: string;
  source: 'monitoring_alert_handoff' | 'incident_console' | 'system';
}

export interface IncidentCapturedSnapshotWindow {
  from: string;
  to: string;
  interval: '1m';
}

export interface IncidentCapturedSnapshotUnavailableSource {
  source: string;
  reasonCode: string;
}

export interface IncidentCapturedSnapshotScope {
  scopeType: string;
  scopeId: string;
  rackId?: string;
}

export interface IncidentCapturedSnapshot {
  schemaVersion: 'incident.context.v1';
  capturedAt: string;
  window: IncidentCapturedSnapshotWindow;
  completeness: 'complete' | 'partial' | 'minimal';
  unavailableSources: IncidentCapturedSnapshotUnavailableSource[];
  alert: Record<string, unknown>;
  scope: IncidentCapturedSnapshotScope;
  asset?: Record<string, unknown>;
  observedHardware?: Record<string, unknown>;
  condition?: Record<string, unknown>;
  impact?: Record<string, unknown>;
  metricEvidence?: Record<string, unknown>[];
  sourceRefs?: Record<string, unknown>[];
}

export interface IncidentEntityProps {
  id: string;
  incidentCode: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  ticketIds: string[];
  createdBy?: IncidentCreatedBy;
  metadata?: Record<string, unknown>;
  capturedSnapshot?: IncidentCapturedSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

export class IncidentEntity {
  constructor(public readonly props: IncidentEntityProps) {}
}
