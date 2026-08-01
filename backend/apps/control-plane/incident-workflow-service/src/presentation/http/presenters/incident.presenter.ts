import type { IncidentEntity } from '@domain/entities/incident.entity';
import type { TicketEntity } from '@domain/entities/ticket.entity';
import { deriveEffectiveIncidentStatus } from '@domain/policies/incident-ticket-status.policy';
import type {
  IncidentDetailAlertDto,
  IncidentDetailEvidenceDto,
  IncidentDetailEvidenceMetricDto,
  IncidentDetailResponseDto,
  IncidentDetailSourceAlertDto,
  IncidentDetailSourceFactsDto,
  IncidentDetailSourceRefDto,
  IncidentDetailTriggerDto,
  IncidentListItemAlertDto,
  IncidentListItemAssetDto,
  IncidentListItemImpactDto,
  IncidentListItemResponseDto,
  IncidentListItemScopeDto,
  IncidentListItemTicketLinkageDto,
  IncidentResponseDto,
  RelatedIncidentSummaryDto,
} from '../dto/incident-response.dto';

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
}

function stringValue(input: unknown): string | undefined {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function numberValue(input: unknown): number | undefined {
  return typeof input === 'number' && Number.isFinite(input)
    ? input
    : undefined;
}

function buildScope(entity: IncidentEntity): IncidentListItemScopeDto {
  const snapshotScope = entity.props.capturedSnapshot?.scope;
  const metadata = entity.props.metadata ?? {};
  const metadataScopeType = stringValue(metadata.scopeType);

  const type = snapshotScope?.scopeType?.trim() || metadataScopeType || null;
  const id =
    snapshotScope?.scopeId?.trim() ||
    getScopeIdFromMetadata(metadata, metadataScopeType) ||
    null;

  return {
    type,
    id,
    ...(snapshotScope?.rackId ? { rackId: snapshotScope.rackId } : {}),
    ...pickStringFields(metadata, [
      'rackId',
      'nodeId',
      'workloadId',
      'serviceId',
    ]),
  };
}

function getScopeIdFromMetadata(
  metadata: Record<string, unknown>,
  scopeType: string | undefined,
): string | undefined {
  switch (scopeType) {
    case 'rack':
      return stringValue(metadata.rackId);
    case 'node':
      return stringValue(metadata.nodeId);
    case 'workload':
      return stringValue(metadata.workloadId);
    case 'service':
      return stringValue(metadata.serviceId);
    default:
      return stringValue(metadata.scopeId);
  }
}

function pickStringFields(
  input: Record<string, unknown>,
  fields: string[],
): Record<string, string> {
  return fields.reduce<Record<string, string>>((result, field) => {
    const value = stringValue(input[field]);
    if (value) {
      result[field] = value;
    }
    return result;
  }, {});
}

function buildAsset(
  entity: IncidentEntity,
): IncidentListItemAssetDto | undefined {
  const asset = entity.props.capturedSnapshot?.asset;
  if (!isRecord(asset)) {
    return undefined;
  }

  const response = {
    displayName: stringValue(asset.displayName),
    siteCode: stringValue(asset.siteCode),
    roomCode: stringValue(asset.roomCode),
    rackCode: stringValue(asset.rackCode),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function buildImpact(
  entity: IncidentEntity,
): IncidentListItemImpactDto | undefined {
  const snapshotImpact = entity.props.capturedSnapshot?.impact;
  const metadata = entity.props.metadata ?? {};
  const rawLabels = isRecord(metadata.rawLabels) ? metadata.rawLabels : {};

  const response = {
    affectedNodeCount: numberValue(snapshotImpact?.affectedNodeCount),
    totalNodeCount: numberValue(snapshotImpact?.totalNodeCount),
    affectedRatio: numberValue(snapshotImpact?.affectedRatio),
    criticalNodeCount: numberFromUnknown(rawLabels.critical_nodes_label),
    silentDeadNodeCount: numberFromUnknown(rawLabels.silent_dead_nodes_label),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function numberFromUnknown(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input;
  }

  if (typeof input !== 'string' || !input.trim()) {
    return undefined;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function metricValueFromUnknown(input: unknown): string | number | undefined {
  return numberFromUnknown(input) ?? stringValue(input);
}

function buildPrimaryAlert(
  entity: IncidentEntity,
): IncidentListItemAlertDto | undefined {
  const snapshotAlert = entity.props.capturedSnapshot?.alert ?? {};
  const metadata = entity.props.metadata ?? {};
  const response = {
    fingerprint:
      stringValue(snapshotAlert.fingerprint) ||
      stringValue(metadata.fingerprint),
    name:
      stringValue(snapshotAlert.alertName) || stringValue(metadata.alertName),
    severity:
      stringValue(snapshotAlert.severity) ||
      stringValue(metadata.monitoringSeverity),
    startedAt:
      stringValue(snapshotAlert.startsAt) || stringValue(metadata.startsAt),
    lastReceivedAt:
      stringValue(metadata.lastReceivedAt) ||
      stringValue(snapshotAlert.lastReceivedAt),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function buildSourceAlert(
  entity: IncidentEntity,
): IncidentDetailSourceAlertDto | undefined {
  const snapshotAlert = entity.props.capturedSnapshot?.alert ?? {};
  const metadata = entity.props.metadata ?? {};
  const response = {
    fingerprint:
      stringValue(snapshotAlert.fingerprint) ||
      stringValue(metadata.fingerprint),
    name:
      stringValue(snapshotAlert.alertName) || stringValue(metadata.alertName),
    severity:
      stringValue(snapshotAlert.severity) ||
      stringValue(metadata.monitoringSeverity),
    category:
      stringValue(snapshotAlert.category) || stringValue(metadata.category),
    environment: stringValue(metadata.environment),
    team: stringValue(metadata.team),
    startedAt:
      stringValue(snapshotAlert.startsAt) || stringValue(metadata.startsAt),
    lastReceivedAt:
      stringValue(metadata.lastReceivedAt) ||
      stringValue(snapshotAlert.lastReceivedAt),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function buildTrigger(
  entity: IncidentEntity,
): IncidentDetailTriggerDto | undefined {
  const snapshotAlert = entity.props.capturedSnapshot?.alert ?? {};
  const metadata = entity.props.metadata ?? {};
  const metricKey =
    stringValue(snapshotAlert.metricKey) || stringValue(metadata.metricKey);
  const metricEvidence = findMetricEvidence(entity, metricKey);
  const rawAnnotations = isRecord(metadata.rawAnnotations)
    ? metadata.rawAnnotations
    : {};
  const response = {
    metricKey,
    currentValue:
      metricValueFromUnknown(snapshotAlert.currentValue) ??
      metricValueFromUnknown(metadata.currentValue),
    threshold:
      metricValueFromUnknown(snapshotAlert.threshold) ??
      metricValueFromUnknown(metadata.threshold),
    unit:
      stringValue(snapshotAlert.unit) ||
      stringValue(metricEvidence?.unit) ||
      stringValue(rawAnnotations.unit),
    observedWindow: stringValue(metadata.observedWindow),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function findMetricEvidence(
  entity: IncidentEntity,
  metricKey: string | undefined,
): Record<string, unknown> | undefined {
  const metricEvidence = entity.props.capturedSnapshot?.metricEvidence ?? [];
  const records = metricEvidence.filter(isRecord);

  if (!metricKey) {
    return records[0];
  }

  return (
    records.find((item) => stringValue(item.metricKey) === metricKey) ??
    records[0]
  );
}

function buildSourceFacts(
  entity: IncidentEntity,
): IncidentDetailSourceFactsDto {
  return {
    alert: buildSourceAlert(entity),
    trigger: buildTrigger(entity),
    asset: buildAsset(entity),
    impact: buildImpact(entity),
  };
}

function buildLinks(entity: IncidentEntity) {
  const metadata = entity.props.metadata ?? {};
  const response = {
    dashboardUrl: stringValue(metadata.dashboardUrl),
    runbookUrl: stringValue(metadata.runbookUrl),
  };

  return hasDefinedValue(response) ? response : undefined;
}

function buildTicketLinkage(
  entity: IncidentEntity,
  tickets: TicketEntity[],
): IncidentListItemTicketLinkageDto {
  const ticketsById = new Map(
    tickets.map((ticket) => [ticket.props.id, ticket]),
  );
  const linkedTicketIds = [
    ...entity.props.ticketIds,
    ...tickets
      .map((ticket) => ticket.props.id)
      .filter((ticketId) => !entity.props.ticketIds.includes(ticketId)),
  ];

  const ticketReferences = linkedTicketIds.map((ticketId) => {
    const ticket = ticketsById.get(ticketId);

    return {
      id: ticketId,
      ...(ticket
        ? {
            ticketCode: ticket.props.ticketCode,
            status: ticket.props.status,
          }
        : {}),
    };
  });

  return {
    linkingStatus: ticketReferences.length > 0 ? 'linked' : 'not_linked',
    isLinked: ticketReferences.length > 0,
    linkedTicketCount: ticketReferences.length,
    tickets: ticketReferences,
  };
}

function buildSummary(entity: IncidentEntity) {
  const metadata = entity.props.metadata ?? {};
  const summary = isRecord(metadata.summary) ? metadata.summary : {};
  const where = isRecord(summary.where) ? summary.where : {};
  const asset = buildAsset(entity);
  const impact = buildImpact(entity);
  const scope = buildScope(entity);

  return {
    whatHappened:
      stringValue(summary.whatHappened) ||
      entity.props.description ||
      entity.props.title,
    where: buildWhereText(asset, scope, where),
    whatIsAffected: buildAffectedText(impact),
    urgency: stringValue(summary.urgency),
  };
}

function buildDetailSummary(entity: IncidentEntity) {
  const metadata = entity.props.metadata ?? {};
  const summary = isRecord(metadata.summary) ? metadata.summary : {};

  return {
    whatHappened:
      stringValue(summary.whatHappened) ||
      entity.props.description ||
      entity.props.title,
    scope: buildScope(entity),
    urgency: stringValue(summary.urgency),
  };
}

function buildEvidence(
  entity: IncidentEntity,
): IncidentDetailEvidenceDto | undefined {
  const snapshot = entity.props.capturedSnapshot;
  if (!snapshot) {
    return undefined;
  }

  return {
    type: 'creation_snapshot',
    capturedAt: snapshot.capturedAt,
    window: snapshot.window,
    completeness: snapshot.completeness,
    metrics: (snapshot.metricEvidence ?? []).filter(isRecord).map(
      (metric): IncidentDetailEvidenceMetricDto => ({
        metricKey: stringValue(metric.metricKey),
        label: stringValue(metric.label),
        value:
          metricValueFromUnknown(metric.lastValueNumeric) ??
          metricValueFromUnknown(metric.value) ??
          metricValueFromUnknown(metric.currentValue),
        unit: stringValue(metric.unit),
        observedAt: stringValue(metric.observedAt),
      }),
    ),
    unavailableSources: snapshot.unavailableSources ?? [],
  };
}

function buildAlerts(entity: IncidentEntity): IncidentDetailAlertDto[] {
  const alert = buildSourceAlert(entity);
  return alert
    ? [
        {
          ...alert,
          role: 'primary',
        },
      ]
    : [];
}

function buildTickets(entity: IncidentEntity) {
  return entity.props.ticketIds.map((ticketId) => ({
    id: ticketId,
  }));
}

function buildSourceRefs(entity: IncidentEntity): IncidentDetailSourceRefDto[] {
  return (entity.props.capturedSnapshot?.sourceRefs ?? [])
    .filter(isRecord)
    .map((sourceRef) => ({
      system: stringValue(sourceRef.system),
      dataset: stringValue(sourceRef.dataset),
      observedAt: stringValue(sourceRef.observedAt),
    }));
}

function buildWhereText(
  asset: IncidentListItemAssetDto | undefined,
  scope: IncidentListItemScopeDto,
  summaryWhere: Record<string, unknown>,
): string | null {
  const locationParts = [
    asset?.siteCode,
    asset?.roomCode,
    asset?.displayName || asset?.rackCode,
  ].filter(Boolean);

  if (locationParts.length > 0) {
    return locationParts.join(' / ');
  }

  return (
    stringValue(summaryWhere.rackId) ||
    stringValue(summaryWhere.nodeId) ||
    scope.id ||
    null
  );
}

function buildAffectedText(
  impact: IncidentListItemImpactDto | undefined,
): string | null {
  if (
    typeof impact?.affectedNodeCount === 'number' &&
    typeof impact.totalNodeCount === 'number'
  ) {
    return `${impact.affectedNodeCount} of ${impact.totalNodeCount} nodes affected`;
  }

  return null;
}

function hasDefinedValue(input: Record<string, unknown>): boolean {
  return Object.values(input).some((value) => value !== undefined);
}

export class IncidentPresenter {
  static toResponse(entity: IncidentEntity): IncidentResponseDto {
    return {
      id: entity.props.id,
      incidentCode: entity.props.incidentCode,
      title: entity.props.title,
      description: entity.props.description,
      severity: entity.props.severity,
      status: entity.props.status,
      ticketIds: entity.props.ticketIds,
      createdBy: entity.props.createdBy,
      metadata: entity.props.metadata ?? {},
      capturedSnapshot: entity.props.capturedSnapshot,
      createdAt: entity.props.createdAt.toISOString(),
      updatedAt: entity.props.updatedAt.toISOString(),
    };
  }

  static toListItem(input: {
    incident: IncidentEntity;
    tickets: TicketEntity[];
  }): IncidentListItemResponseDto {
    const entity = input.incident;

    return {
      id: entity.props.id,
      incidentCode: entity.props.incidentCode,
      title: entity.props.title,
      severity: entity.props.severity,
      status: deriveEffectiveIncidentStatus(entity, input.tickets),
      summary: buildSummary(entity),
      scope: buildScope(entity),
      asset: buildAsset(entity),
      impact: buildImpact(entity),
      primaryAlert: buildPrimaryAlert(entity),
      ticketCount: entity.props.ticketIds.length,
      ticketLinkage: buildTicketLinkage(entity, input.tickets),
      links: buildLinks(entity),
      createdAt: entity.props.createdAt.toISOString(),
      updatedAt: entity.props.updatedAt.toISOString(),
    };
  }

  static toResponseList(
    entries: Array<{ incident: IncidentEntity; tickets: TicketEntity[] }>,
  ): IncidentListItemResponseDto[] {
    return entries.map((entry) => this.toListItem(entry));
  }

  static toRelatedSummary(entity: IncidentEntity): RelatedIncidentSummaryDto {
    return {
      id: entity.props.id,
      incidentCode: entity.props.incidentCode,
      title: entity.props.title,
      severity: entity.props.severity,
      status: entity.props.status,
      createdAt: entity.props.createdAt.toISOString(),
      updatedAt: entity.props.updatedAt.toISOString(),
    };
  }

  static toDetailResponse(input: {
    incident: IncidentEntity;
    relatedIncidents: IncidentEntity[];
  }): IncidentDetailResponseDto {
    const incident = input.incident;

    return {
      id: incident.props.id,
      incidentCode: incident.props.incidentCode,
      title: incident.props.title,
      state: {
        status: incident.props.status,
        severity: incident.props.severity,
        createdAt: incident.props.createdAt.toISOString(),
        updatedAt: incident.props.updatedAt.toISOString(),
        resolvedAt: null,
        closedAt: null,
      },
      summary: buildDetailSummary(incident),
      sourceFacts: buildSourceFacts(incident),
      evidence: buildEvidence(incident),
      alerts: buildAlerts(incident),
      tickets: buildTickets(incident),
      links: buildLinks(incident),
      sourceRefs: buildSourceRefs(incident),
      relatedIncidents: input.relatedIncidents.map((entity) =>
        this.toRelatedSummary(entity),
      ),
    };
  }
}
