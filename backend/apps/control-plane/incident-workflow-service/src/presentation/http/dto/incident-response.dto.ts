import type {
  IncidentCapturedSnapshot,
  IncidentCreatedBy,
} from '@domain/entities/incident.entity';
import type { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import type { IncidentStatus } from '@domain/constants/incident-status.enum';

export interface IncidentResponseDto {
  id: string;
  incidentCode: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  ticketIds: string[];
  createdBy?: IncidentCreatedBy;
  metadata: Record<string, unknown>;
  capturedSnapshot?: IncidentCapturedSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedIncidentSummaryDto {
  id: string;
  incidentCode: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDetailResponseDto extends IncidentResponseDto {
  relatedIncidents: RelatedIncidentSummaryDto[];
}
