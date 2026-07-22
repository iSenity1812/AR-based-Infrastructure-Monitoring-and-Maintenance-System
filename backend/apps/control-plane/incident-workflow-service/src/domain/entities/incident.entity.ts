import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';

export interface IncidentCreatedBy {
  userId: string;
  username: string;
  fullName?: string;
  source: 'monitoring_alert_handoff' | 'incident_console' | 'system';
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
  createdAt: Date;
  updatedAt: Date;
}

export class IncidentEntity {
  constructor(public readonly props: IncidentEntityProps) {}
}
