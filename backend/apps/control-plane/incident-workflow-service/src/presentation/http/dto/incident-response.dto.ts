import type {
  IncidentCapturedSnapshot,
  IncidentCreatedBy,
} from '@domain/entities/incident.entity';
import type { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import type { IncidentStatus } from '@domain/constants/incident-status.enum';
import type { TicketStatus } from '@domain/constants/ticket-status.enum';

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

export interface IncidentListItemScopeDto {
  type: string | null;
  id: string | null;
  rackId?: string;
  nodeId?: string;
  workloadId?: string;
  serviceId?: string;
}

export interface IncidentListItemAssetDto {
  displayName?: string;
  siteCode?: string;
  roomCode?: string;
  rackCode?: string;
}

export interface IncidentListItemImpactDto {
  affectedNodeCount?: number;
  totalNodeCount?: number;
  affectedRatio?: number;
  criticalNodeCount?: number;
  silentDeadNodeCount?: number;
}

export interface IncidentListItemSummaryDto {
  whatHappened: string;
  where: string | null;
  whatIsAffected: string | null;
  urgency?: string;
}

export interface IncidentListItemAlertDto {
  fingerprint?: string;
  name?: string;
  severity?: string;
  startedAt?: string;
  lastReceivedAt?: string;
}

export interface IncidentListItemLinksDto {
  dashboardUrl?: string;
  runbookUrl?: string;
}

export interface IncidentListItemTicketReferenceDto {
  id: string;
  ticketCode?: string;
  status?: TicketStatus;
}

export interface IncidentListItemTicketLinkageDto {
  linkingStatus: 'linked' | 'not_linked';
  isLinked: boolean;
  linkedTicketCount: number;
  tickets: IncidentListItemTicketReferenceDto[];
}

export interface IncidentListItemResponseDto {
  id: string;
  incidentCode: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  summary: IncidentListItemSummaryDto;
  scope: IncidentListItemScopeDto;
  asset?: IncidentListItemAssetDto;
  impact?: IncidentListItemImpactDto;
  primaryAlert?: IncidentListItemAlertDto;
  ticketCount: number;
  ticketLinkage: IncidentListItemTicketLinkageDto;
  links?: IncidentListItemLinksDto;
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

export interface IncidentDetailStateDto {
  status: IncidentStatus;
  severity: IncidentSeverity;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface IncidentDetailSummaryDto {
  whatHappened: string;
  scope: IncidentListItemScopeDto;
  urgency?: string;
}

export interface IncidentDetailSourceAlertDto {
  fingerprint?: string;
  name?: string;
  severity?: string;
  category?: string;
  environment?: string;
  team?: string;
  startedAt?: string;
  lastReceivedAt?: string;
}

export interface IncidentDetailTriggerDto {
  metricKey?: string;
  currentValue?: string | number;
  threshold?: string | number;
  unit?: string;
  observedWindow?: string;
}

export interface IncidentDetailSourceFactsDto {
  alert?: IncidentDetailSourceAlertDto;
  trigger?: IncidentDetailTriggerDto;
  asset?: IncidentListItemAssetDto;
  impact?: IncidentListItemImpactDto;
}

export interface IncidentDetailEvidenceMetricDto {
  metricKey?: string;
  label?: string;
  value?: string | number;
  unit?: string;
  observedAt?: string;
}

export interface IncidentDetailEvidenceDto {
  type: 'creation_snapshot';
  capturedAt: string;
  window: IncidentCapturedSnapshot['window'];
  completeness: IncidentCapturedSnapshot['completeness'];
  metrics: IncidentDetailEvidenceMetricDto[];
  unavailableSources: IncidentCapturedSnapshot['unavailableSources'];
}

export interface IncidentDetailAlertDto extends IncidentDetailSourceAlertDto {
  status?: string;
  role: 'primary';
}

export interface IncidentDetailTicketDto {
  id: string;
}

export interface IncidentDetailSourceRefDto {
  system?: string;
  dataset?: string;
  observedAt?: string;
}

export interface IncidentDetailResponseDto {
  id: string;
  incidentCode: string;
  title: string;
  state: IncidentDetailStateDto;
  summary: IncidentDetailSummaryDto;
  sourceFacts: IncidentDetailSourceFactsDto;
  evidence?: IncidentDetailEvidenceDto;
  alerts: IncidentDetailAlertDto[];
  tickets: IncidentDetailTicketDto[];
  links?: IncidentListItemLinksDto;
  sourceRefs: IncidentDetailSourceRefDto[];
  relatedIncidents: RelatedIncidentSummaryDto[];
}
