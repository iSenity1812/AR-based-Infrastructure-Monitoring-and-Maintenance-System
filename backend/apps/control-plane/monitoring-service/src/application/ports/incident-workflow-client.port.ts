import type { AlertIncidentSeverity } from '../../domain/alert-current-state';
import type { IncidentContextSnapshot } from '../services/incident-context-snapshot.contract';

export interface IncidentWorkflowIncident {
  incidentId: string;
  incidentCode: string;
  title: string;
  severity: AlertIncidentSeverity;
  status: string;
  createdBy?: {
    userId: string;
    username: string;
    fullName?: string;
    source: 'monitoring_alert_handoff' | 'incident_console' | 'system';
  };
  metadata: Record<string, unknown>;
  capturedSnapshot?: IncidentContextSnapshot;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateIncidentWorkflowCommand {
  authorizationHeader: string;
  correlationId?: string;
  incidentCode: string;
  title: string;
  description?: string;
  severity: AlertIncidentSeverity;
  metadata: Record<string, unknown>;
  capturedSnapshot?: IncidentContextSnapshot;
}

export interface IncidentWorkflowTicket {
  ticketId: string;
  ticketCode: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  incidentId: string | null;
}

export interface CreateTicketWorkflowCommand {
  authorizationHeader: string;
  correlationId?: string;
  ticketCode: string;
  title: string;
  description?: string;
  priority: IncidentWorkflowTicket['priority'];
  incidentId?: string;
  ownerUserId?: string;
  metadata?: Record<string, unknown>;
}

export abstract class IncidentWorkflowClientPort {
  abstract createIncident(
    command: CreateIncidentWorkflowCommand,
  ): Promise<IncidentWorkflowIncident>;

  abstract findIncidentByCode(input: {
    authorizationHeader: string;
    correlationId?: string;
    incidentCode: string;
  }): Promise<IncidentWorkflowIncident | null>;

  abstract createTicket(
    command: CreateTicketWorkflowCommand,
  ): Promise<IncidentWorkflowTicket>;
}

export class IncidentWorkflowConflictError extends Error {
  constructor(public readonly incidentCode: string) {
    super(`Incident ${incidentCode} already exists.`);
    this.name = IncidentWorkflowConflictError.name;
  }
}

export class IncidentWorkflowUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = IncidentWorkflowUnavailableError.name;
  }
}

export class IncidentWorkflowTicketConflictError extends Error {
  constructor(public readonly ticketCode: string) {
    super(`Ticket ${ticketCode} already exists.`);
    this.name = IncidentWorkflowTicketConflictError.name;
  }
}
