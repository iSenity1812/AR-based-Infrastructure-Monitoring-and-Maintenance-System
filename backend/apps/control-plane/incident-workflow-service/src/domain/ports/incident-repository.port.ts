import type {
  IncidentCapturedSnapshot,
  IncidentCreatedBy,
} from '@domain/entities/incident.entity';
import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { IncidentEntity } from '@domain/entities/incident.entity';

export interface CreateIncidentRecord {
  incidentCode: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  ticketIds?: string[];
  createdBy?: IncidentCreatedBy;
  metadata?: Record<string, unknown>;
  capturedSnapshot?: IncidentCapturedSnapshot;
}

export interface IncidentListQuery {
  incidentCode?: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  ticketId?: string;
  scopeType?: string;
  scopeId?: string;
}

export interface IncidentUpdateRecord {
  incidentCode?: string;
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  ticketIds?: string[];
  createdBy?: IncidentCreatedBy;
  metadata?: Record<string, unknown>;
  capturedSnapshot?: IncidentCapturedSnapshot;
}

export interface IncidentRepositoryPort {
  create(input: CreateIncidentRecord): Promise<IncidentEntity>;
  findById(incidentId: string): Promise<IncidentEntity | null>;
  findByCode(incidentCode: string): Promise<IncidentEntity | null>;
  findMany(query?: IncidentListQuery): Promise<IncidentEntity[]>;
  findRelatedByScope(input: {
    scopeType: string;
    scopeId: string;
    excludeIncidentId: string;
    limit?: number;
  }): Promise<IncidentEntity[]>;
  update(
    incidentId: string,
    input: IncidentUpdateRecord,
  ): Promise<IncidentEntity | null>;
}
