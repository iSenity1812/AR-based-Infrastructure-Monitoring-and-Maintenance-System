import type { AlertIncidentSeverity } from '../../domain/alert-current-state';

export interface IncidentWorkflowIncident {
  incidentId: string;
  incidentCode: string;
  title: string;
  severity: AlertIncidentSeverity;
  status: string;
  metadata: Record<string, unknown>;
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
