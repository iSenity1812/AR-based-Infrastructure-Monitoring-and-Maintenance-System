import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertIncidentLinkage,
  AlertIncidentSeverity,
} from '../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import {
  IncidentWorkflowClientPort,
  IncidentWorkflowConflictError,
  type IncidentWorkflowIncident,
  IncidentWorkflowUnavailableError,
} from '../ports/incident-workflow-client.port';
import {
  buildAlertIncidentMetadata,
  buildIncidentCodeFromAlertFingerprint,
  mapAlertSeverityToIncidentSeverity,
} from '../mappers/alert-incident-handoff.mapper';

export interface CreateIncidentFromAlertCommand {
  fingerprint: string;
  authorizationHeader: string | null;
  correlationId?: string;
  title?: string;
  description?: string;
  operatorNote?: string;
  severityOverride?: AlertIncidentSeverity;
}

export interface CreateIncidentFromAlertResult {
  fingerprint: string;
  action: 'created' | 'already_linked' | 'linked_existing';
  triageStatus: 'incident_created';
  alert: {
    alertName: string;
    scopeType: AlertCurrentState['scopeType'];
    nodeId?: string;
    rackId?: string;
    workloadId?: string;
    serviceId?: string;
    severity: AlertCurrentState['severity'];
    status: AlertCurrentState['status'];
    category: AlertCurrentState['category'];
    summary: string;
    startsAt: string;
    lastReceivedAt: string;
  };
  incident: {
    incidentId: string;
    incidentCode: string;
    status: string;
    severity: AlertIncidentSeverity;
    title: string;
    createdAt: string;
    linkedAt: string;
  };
}

@Injectable()
export class CreateIncidentFromAlertUseCase {
  constructor(
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
    @Inject(IncidentWorkflowClientPort)
    private readonly incidentWorkflowClient: IncidentWorkflowClientPort,
  ) {}

  async execute(
    command: CreateIncidentFromAlertCommand,
  ): Promise<CreateIncidentFromAlertResult> {
    const fingerprint = normalizeFingerprint(command.fingerprint);
    const authorizationHeader = normalizeAuthorizationHeader(
      command.authorizationHeader,
    );

    const alert =
      await this.alertCurrentStateRepository.findByFingerprint(fingerprint);

    if (!alert) {
      throw new NotFoundException({
        title: 'ALERT_NOT_FOUND',
        detail: `Alert ${fingerprint} was not found.`,
      });
    }

    const existingLinkage = buildExistingLinkedResult(alert);
    if (existingLinkage) {
      return existingLinkage;
    }

    if (alert.status !== 'firing') {
      throw new ConflictException({
        title: 'ALERT_NOT_ACTIVE',
        detail: `Alert ${fingerprint} is not firing.`,
      });
    }

    const incidentSeverity = resolveIncidentSeverity(
      alert,
      command.severityOverride,
    );
    const incidentCode = buildIncidentCodeFromAlertFingerprint(fingerprint);
    const metadata = buildAlertIncidentMetadata({
      alert,
      incidentSeverity,
      operatorNote: command.operatorNote,
    });

    try {
      const createdIncident = await this.incidentWorkflowClient.createIncident({
        authorizationHeader,
        correlationId: command.correlationId,
        incidentCode,
        title: normalizeOptionalText(command.title) ?? buildDefaultTitle(alert),
        description:
          normalizeOptionalText(command.description) ??
          buildDefaultDescription(alert),
        severity: incidentSeverity,
        metadata: metadata as unknown as Record<string, unknown>,
      });

      return this.persistLinkage({
        alert,
        incident: createdIncident,
        action: 'created',
      });
    } catch (error) {
      if (error instanceof IncidentWorkflowConflictError) {
        return this.recoverExistingIncidentLinkage({
          alert,
          authorizationHeader,
          correlationId: command.correlationId,
          incidentCode,
        });
      }

      if (error instanceof IncidentWorkflowUnavailableError) {
        throw new BadGatewayException({
          title: 'INCIDENT_SERVICE_UNAVAILABLE',
          detail: error.message,
        });
      }

      throw error;
    }
  }

  private async recoverExistingIncidentLinkage(input: {
    alert: AlertCurrentState;
    authorizationHeader: string;
    correlationId?: string;
    incidentCode: string;
  }): Promise<CreateIncidentFromAlertResult> {
    const existingIncident =
      await this.incidentWorkflowClient.findIncidentByCode({
        authorizationHeader: input.authorizationHeader,
        correlationId: input.correlationId,
        incidentCode: input.incidentCode,
      });

    if (
      !existingIncident ||
      existingIncident.metadata.fingerprint !== input.alert.fingerprint
    ) {
      throw new ConflictException({
        title: 'INCIDENT_ALREADY_EXISTS',
        detail:
          'Incident code is already used by an incident that cannot be safely linked to this alert.',
      });
    }

    return this.persistLinkage({
      alert: input.alert,
      incident: existingIncident,
      action: 'linked_existing',
    });
  }

  private async persistLinkage(input: {
    alert: AlertCurrentState;
    incident: IncidentWorkflowIncident;
    action: 'created' | 'linked_existing';
  }): Promise<CreateIncidentFromAlertResult> {
    const linkedAt = new Date().toISOString();
    const linkage: AlertIncidentLinkage = {
      triageStatus: 'incident_created',
      incidentId: input.incident.incidentId,
      incidentCode: input.incident.incidentCode,
      incidentStatus: input.incident.status,
      incidentSeverity: input.incident.severity,
      incidentTitle: input.incident.title,
      incidentCreatedAt: input.incident.createdAt,
      incidentLinkedAt: linkedAt,
      lastEscalatedAt: linkedAt,
    };

    const updated =
      await this.alertCurrentStateRepository.updateIncidentLinkage(
        input.alert.fingerprint,
        linkage,
      );

    if (!updated) {
      throw new InternalServerErrorException({
        title: 'ALERT_LINKAGE_UPDATE_FAILED',
        detail:
          'Incident was created or found, but Monitoring could not persist alert linkage.',
      });
    }

    return buildResult({
      alert: updated,
      action: input.action,
      linkedAt,
    });
  }
}

function buildExistingLinkedResult(
  alert: AlertCurrentState,
): CreateIncidentFromAlertResult | null {
  if (
    alert.triageStatus !== 'incident_created' ||
    !alert.incidentId ||
    !alert.incidentCode ||
    !alert.incidentSeverity ||
    !alert.incidentTitle ||
    !alert.incidentCreatedAt
  ) {
    return null;
  }

  return buildResult({
    alert,
    action: 'already_linked',
    linkedAt:
      alert.incidentLinkedAt ??
      alert.lastEscalatedAt ??
      new Date().toISOString(),
  });
}

function buildResult(input: {
  alert: AlertCurrentState;
  action: CreateIncidentFromAlertResult['action'];
  linkedAt: string;
}): CreateIncidentFromAlertResult {
  const { alert } = input;

  return {
    fingerprint: alert.fingerprint,
    action: input.action,
    triageStatus: 'incident_created',
    alert: {
      alertName: alert.alertName,
      scopeType: alert.scopeType,
      ...mapScopeIdentity(alert),
      severity: alert.severity,
      status: alert.status,
      category: alert.category,
      summary: alert.summary,
      startsAt: alert.startsAt,
      lastReceivedAt: alert.lastReceivedAt,
    },
    incident: {
      incidentId: alert.incidentId ?? '',
      incidentCode: alert.incidentCode ?? '',
      status: alert.incidentStatus ?? 'UNKNOWN',
      severity: alert.incidentSeverity ?? 'HIGH',
      title: alert.incidentTitle ?? '',
      createdAt: alert.incidentCreatedAt ?? input.linkedAt,
      linkedAt: input.linkedAt,
    },
  };
}

function resolveIncidentSeverity(
  alert: AlertCurrentState,
  override: AlertIncidentSeverity | undefined,
): AlertIncidentSeverity {
  const mapped = mapAlertSeverityToIncidentSeverity(alert.severity);

  if (!override) {
    return mapped;
  }

  if (alert.severity === 'critical' && override !== 'CRITICAL') {
    throw new BadRequestException({
      title: 'INVALID_SEVERITY_OVERRIDE',
      detail: 'Critical alerts cannot be downgraded below CRITICAL.',
    });
  }

  return override;
}

function buildDefaultTitle(alert: AlertCurrentState): string {
  return `[${alert.scopeType}] ${alert.alertName}: ${alert.summary}`;
}

function buildDefaultDescription(alert: AlertCurrentState): string {
  return [
    alert.description,
    '',
    `Alert fingerprint: ${alert.fingerprint}`,
    `Scope: ${alert.scopeType} ${formatScopeIdentity(alert)}`,
    `Started at: ${alert.startsAt}`,
    `Last received at: ${alert.lastReceivedAt}`,
    `Dashboard: ${alert.dashboardUrl ?? 'n/a'}`,
    `Runbook: ${alert.runbookUrl ?? 'n/a'}`,
  ].join('\n');
}

function normalizeFingerprint(input: string): string {
  const normalized = input.trim();
  if (!normalized || normalized.length > 512) {
    throw new BadRequestException({
      title: 'INVALID_ALERT_FINGERPRINT',
      detail: 'Alert fingerprint is required and must be at most 512 chars.',
    });
  }

  return normalized;
}

function normalizeAuthorizationHeader(input: string | null): string {
  if (!input?.trim()) {
    throw new BadRequestException({
      title: 'AUTHORIZATION_HEADER_REQUIRED',
      detail: 'Authorization header is required for incident handoff.',
    });
  }

  return input.trim();
}

function normalizeOptionalText(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized : undefined;
}

function formatScopeIdentity(alert: AlertCurrentState): string {
  switch (alert.scopeType) {
    case 'node':
      return alert.nodeId;
    case 'rack':
      return alert.rackId;
    case 'workload':
      return alert.workloadId;
    case 'service':
      return alert.serviceId;
  }
}

function mapScopeIdentity(
  alert: AlertCurrentState,
): Pick<
  CreateIncidentFromAlertResult['alert'],
  'nodeId' | 'rackId' | 'workloadId' | 'serviceId'
> {
  switch (alert.scopeType) {
    case 'node':
      return {
        nodeId: alert.nodeId,
        rackId: alert.rackId,
      };
    case 'rack':
      return {
        rackId: alert.rackId,
      };
    case 'workload':
      return {
        workloadId: alert.workloadId,
        nodeId: alert.nodeId,
        rackId: alert.rackId,
      };
    case 'service':
      return {
        serviceId: alert.serviceId,
      };
  }
}
