import { Inject, Injectable, Logger } from '@nestjs/common';

import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import type { AlertCurrentState } from '../../domain/alert-current-state';
import {
  IncidentWorkflowClientPort,
  IncidentWorkflowTicketConflictError,
  IncidentWorkflowUnavailableError,
} from '../ports/incident-workflow-client.port';
import { MonitoringEventRepository } from '../ports/monitoring-event.repository';
import {
  mapExternalAlertToCurrentState,
  type SyncExternalAlertsCommand,
} from '../mappers/external-alert-sync.mapper';
import { CreateIncidentFromAlertUseCase } from './create-incident-from-alert.use-case';
import { MonitoringIncidentPolicyService } from '../services/monitoring-incident-policy.service';
import { MonitoringWorkflowSystemAuthService } from '../services/monitoring-workflow-system-auth.service';
import { buildIncidentCodeFromAlertFingerprint } from '../mappers/alert-incident-handoff.mapper';

export interface SyncExternalAlertItemResult {
  kind: 'synced' | 'invalid' | 'skipped';
  fingerprint: string | null;
  action?: 'created' | 'updated' | 'resolved' | 'noop';
  reason?: string;
}

export interface SyncExternalAlertsUseCaseResult {
  totalReceived: number;
  synced: number;
  invalid: number;
  skipped: number;
  results: SyncExternalAlertItemResult[];
}

@Injectable()
export class SyncExternalAlertsUseCase {
  private readonly logger = new Logger(SyncExternalAlertsUseCase.name);

  constructor(
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
    @Inject(MonitoringEventRepository)
    private readonly monitoringEventRepository: MonitoringEventRepository,
    private readonly createIncidentFromAlertUseCase: CreateIncidentFromAlertUseCase,
    private readonly monitoringIncidentPolicyService: MonitoringIncidentPolicyService,
    private readonly monitoringWorkflowSystemAuthService: MonitoringWorkflowSystemAuthService,
    @Inject(IncidentWorkflowClientPort)
    private readonly incidentWorkflowClient: IncidentWorkflowClientPort,
  ) {}

  async execute(
    input: SyncExternalAlertsCommand,
  ): Promise<SyncExternalAlertsUseCaseResult> {
    const results: SyncExternalAlertItemResult[] = [];

    for (const alert of input.alerts) {
      const mapped = mapExternalAlertToCurrentState({
        receivedAt: input.receivedAt,
        alert,
        commonLabels: input.commonLabels,
        commonAnnotations: input.commonAnnotations,
      });

      if (mapped.kind === 'invalid') {
        this.logger.warn(
          `external alert sync invalid (fingerprint=${mapped.metadata.fingerprint ?? 'unknown'}, alertName=${mapped.metadata.alertName ?? 'unknown'}, scopeType=${mapped.metadata.scopeType ?? 'unknown'}, reason=${mapped.reason})`,
        );
        results.push({
          kind: 'invalid',
          fingerprint: mapped.metadata.fingerprint,
          reason: mapped.reason,
        });
        continue;
      }

      const previous =
        await this.alertCurrentStateRepository.findByFingerprint(
          mapped.state.fingerprint,
        );

      const nextState = buildNextAlertCurrentState(mapped.state, previous);
      await this.alertCurrentStateRepository.upsert(nextState);
      await this.appendMonitoringTransitionEvent(previous, nextState);

      const action = resolveSyncAction(previous, nextState);
      this.logger.log(
        `external alert synced (fingerprint=${nextState.fingerprint}, alertName=${nextState.alertName}, scopeType=${nextState.scopeType}, status=${nextState.status}, action=${action})`,
      );

      await this.maybeTriggerWorkflow(nextState);

      results.push({
        kind: 'synced',
        fingerprint: nextState.fingerprint,
        action,
      });
    }

    return {
      totalReceived: input.alerts.length,
      synced: results.filter((result) => result.kind === 'synced').length,
      invalid: results.filter((result) => result.kind === 'invalid').length,
      skipped: results.filter((result) => result.kind === 'skipped').length,
      results,
    };
  }

  private async maybeTriggerWorkflow(alert: AlertCurrentState): Promise<void> {
    if (alert.status !== 'firing' || alert.triageStatus === 'incident_created') {
      return;
    }

    const decision = this.monitoringIncidentPolicyService.classify(alert);
    if (!decision.shouldCreateIncident || !decision.incidentSeverity) {
      return;
    }

    const authContext =
      await this.monitoringWorkflowSystemAuthService.createSystemAuthContext();

    try {
      const incident = await this.createIncidentFromAlertUseCase.execute({
        fingerprint: alert.fingerprint,
        authorizationHeader: authContext.authorizationHeader,
        actor: authContext.actor,
        severityOverride: decision.incidentSeverity,
      });

      if (!decision.shouldCreateTicket || !decision.ticketPriority) {
        return;
      }

      try {
        await this.incidentWorkflowClient.createTicket({
          authorizationHeader: authContext.authorizationHeader,
          ticketCode: buildTicketCodeFromAlertFingerprint(alert.fingerprint),
          title: incident.incident.title,
          description: buildTicketDescription(alert),
          priority: decision.ticketPriority,
          incidentId: incident.incident.incidentId,
          ownerUserId: authContext.actor.userId,
          metadata: {
            schemaVersion: 'monitoring.alert.ticket.v1',
            source: 'monitoring_alert',
            fingerprint: alert.fingerprint,
            alertName: alert.alertName,
            incidentCode: incident.incident.incidentCode,
          },
        });
      } catch (error) {
        if (error instanceof IncidentWorkflowTicketConflictError) {
          return;
        }

        throw error;
      }
    } catch (error) {
      if (error instanceof IncidentWorkflowUnavailableError) {
        this.logger.warn(
          `automatic workflow handoff skipped (fingerprint=${alert.fingerprint}, alertName=${alert.alertName}, reason=${error.message})`,
        );
        return;
      }

      throw error;
    }
  }

  private async appendMonitoringTransitionEvent(
    previous: AlertCurrentState | null,
    next: AlertCurrentState,
  ): Promise<void> {
    if (next.scopeType !== 'node' && next.scopeType !== 'rack') {
      return;
    }

    const eventType = resolveAlertEventType(previous, next);
    if (!eventType) {
      return;
    }

    const occurredAt = next.lastStatusChangedAt || next.lastReceivedAt;
    const scopeId = deriveAlertScopeId(next);

    await this.monitoringEventRepository.append({
      eventKey: `alert:${next.fingerprint}:${eventType}:${occurredAt}`,
      occurredAt,
      category: 'alert',
      type: eventType,
      scopeType: next.scopeType,
      scopeId,
      nodeId: 'nodeId' in next ? next.nodeId ?? null : null,
      rackId: 'rackId' in next ? next.rackId ?? null : null,
      fingerprint: next.fingerprint,
      incidentCode: next.incidentCode ?? null,
      source: 'external-alert-sync',
      data: {
        fingerprint: next.fingerprint,
        alertName: next.alertName,
        status: next.status,
        severity: next.severity,
        summary: next.summary,
        metricKey: next.metricKey,
        startsAt: next.startsAt,
        lastReceivedAt: next.lastReceivedAt,
        reasonCode: next.rawAnnotations.reason_code ?? null,
        scopeType: next.scopeType,
        scopeId,
      },
    });
  }
}

function buildNextAlertCurrentState(
  incoming: AlertCurrentState,
  previous: AlertCurrentState | null,
): AlertCurrentState {
  if (!previous) {
    return incoming;
  }

  return {
    ...incoming,
    firstSyncedAt: previous.firstSyncedAt,
    lastStatusChangedAt:
      previous.status === incoming.status
        ? previous.lastStatusChangedAt
        : incoming.lastStatusChangedAt,
  };
}

function resolveSyncAction(
  previous: AlertCurrentState | null,
  next: AlertCurrentState,
): 'created' | 'updated' | 'resolved' | 'noop' {
  if (!previous) {
    return 'created';
  }

  if (previous.status !== next.status && next.status === 'resolved') {
    return 'resolved';
  }

  return 'updated';
}

function resolveAlertEventType(
  previous: AlertCurrentState | null,
  next: AlertCurrentState,
): 'alert.fired' | 'alert.resolved' | null {
  if (!previous && next.status === 'firing') {
    return 'alert.fired';
  }

  if (previous?.status === 'resolved' && next.status === 'firing') {
    return 'alert.fired';
  }

  if (previous?.status !== 'resolved' && next.status === 'resolved') {
    return 'alert.resolved';
  }

  return null;
}

function deriveAlertScopeId(alert: AlertCurrentState): string {
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

function buildTicketCodeFromAlertFingerprint(fingerprint: string): string {
  return buildIncidentCodeFromAlertFingerprint(fingerprint).replace(
    /^MON-ALERT-/,
    'MON-TICKET-',
  );
}

function buildTicketDescription(alert: AlertCurrentState): string {
  return [
    alert.summary,
    '',
    alert.description,
    '',
    `Alert fingerprint: ${alert.fingerprint}`,
    `Started at: ${alert.startsAt}`,
    `Last received at: ${alert.lastReceivedAt}`,
  ].join('\n');
}
