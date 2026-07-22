import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  createDefaultAlertIncidentLinkage,
  type AlertCurrentState,
  type AlertIncidentLinkage,
} from '../../domain/alert-current-state';
import type { AlertIncidentHandoffAuditRepository } from '../ports/alert-incident-handoff-audit.repository';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import {
  IncidentWorkflowClientPort,
  IncidentWorkflowConflictError,
  type IncidentWorkflowIncident,
} from '../ports/incident-workflow-client.port';
import { buildIncidentCodeFromAlertFingerprint } from '../mappers/alert-incident-handoff.mapper';
import { CreateIncidentFromAlertUseCase } from './create-incident-from-alert.use-case';

describe('CreateIncidentFromAlertUseCase', () => {
  it('does not call incident workflow when alert is missing', async () => {
    const { useCase, incidentClient } = setup({ alert: null });

    await expect(
      useCase.execute({
        fingerprint: 'fp-missing',
        authorizationHeader: 'Bearer token',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(incidentClient.createIncident).not.toHaveBeenCalled();
  });

  it('rejects unresolved handoff for resolved unlinked alerts', async () => {
    const alert = buildAlert({ status: 'resolved' });
    const { useCase, incidentClient } = setup({ alert });

    await expect(
      useCase.execute({
        fingerprint: alert.fingerprint,
        authorizationHeader: 'Bearer token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(incidentClient.createIncident).not.toHaveBeenCalled();
  });

  it('creates a high incident from a warning alert and stores linkage', async () => {
    const alert = buildAlert({ severity: 'warning' });
    const incident = buildIncident({
      incidentCode: buildIncidentCodeFromAlertFingerprint(alert.fingerprint),
      severity: 'HIGH',
    });
    const { useCase, repository, incidentClient, auditRepository } = setup({
      alert,
      createdIncident: incident,
    });

    const result = await useCase.execute({
      fingerprint: alert.fingerprint,
      authorizationHeader: 'Bearer token',
      actor: buildActor(),
      operatorNote: 'Escalate manually',
    });

    expect(result.action).toBe('created');
    expect(result.incident.severity).toBe('HIGH');
    expect(incidentClient.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'HIGH',
        metadata: expect.objectContaining({
          fingerprint: alert.fingerprint,
          rawLabels: alert.rawLabels,
          rawAnnotations: alert.rawAnnotations,
          requestSessionId: 'session-1',
          operatorNote: 'Escalate manually',
        }),
      }),
    );
    expect(repository.updateIncidentLinkage).toHaveBeenCalledWith(
      alert.fingerprint,
      expect.objectContaining({
        triageStatus: 'incident_created',
        incidentId: incident.incidentId,
      }),
    );
    expect(auditRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: alert.fingerprint,
        actorUserId: 'user-1',
        result: 'created',
      }),
    );
    expect(result.incident.createdBy).toEqual({
      userId: 'user-1',
      username: 'ducpv',
      fullName: 'Pham Van Duc',
      source: 'monitoring_alert_handoff',
    });
  });

  it('recovers linkage from an existing incident after a create conflict', async () => {
    const alert = buildAlert();
    const incident = buildIncident({
      incidentCode: buildIncidentCodeFromAlertFingerprint(alert.fingerprint),
      metadata: {
        fingerprint: alert.fingerprint,
      },
    });
    const { useCase } = setup({
      alert,
      createError: new IncidentWorkflowConflictError(incident.incidentCode),
      foundIncident: incident,
    });

    await expect(
      useCase.execute({
        fingerprint: alert.fingerprint,
        authorizationHeader: 'Bearer token',
        actor: buildActor(),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        action: 'linked_existing',
        incident: expect.objectContaining({
          incidentId: incident.incidentId,
        }),
      }),
    );
  });
});

function setup(input: {
  alert: AlertCurrentState | null;
  createdIncident?: IncidentWorkflowIncident;
  foundIncident?: IncidentWorkflowIncident | null;
  createError?: Error;
}) {
  let currentAlert = input.alert;
  const repository = {
    findByFingerprint: jest.fn<
      AlertCurrentStateRepository['findByFingerprint']
    >(async () => currentAlert),
    updateIncidentLinkage: jest.fn<
      AlertCurrentStateRepository['updateIncidentLinkage']
    >(async (_fingerprint: string, linkage: AlertIncidentLinkage) => {
      if (!currentAlert) {
        return null;
      }

      currentAlert = {
        ...currentAlert,
        ...linkage,
      };

      return currentAlert;
    }),
  } as unknown as jest.Mocked<AlertCurrentStateRepository>;

  const incidentClient = {
    createIncident: jest.fn<IncidentWorkflowClientPort['createIncident']>(
      async () => {
        if (input.createError) {
          throw input.createError;
        }

        return input.createdIncident ?? buildIncident();
      },
    ),
    findIncidentByCode: jest.fn<
      IncidentWorkflowClientPort['findIncidentByCode']
    >(async () => input.foundIncident ?? null),
  } as unknown as jest.Mocked<IncidentWorkflowClientPort>;
  const auditRepository = {
    append: jest.fn<AlertIncidentHandoffAuditRepository['append']>(
      async () => undefined,
    ),
  } as unknown as jest.Mocked<AlertIncidentHandoffAuditRepository>;

  return {
    repository,
    incidentClient,
    auditRepository,
    useCase: new CreateIncidentFromAlertUseCase(
      repository,
      incidentClient,
      auditRepository,
    ),
  };
}

function buildActor() {
  return {
    userId: 'user-1',
    username: 'ducpv',
    sessionId: 'session-1',
    fullName: 'Pham Van Duc',
  };
}

function buildAlert(
  override: Partial<AlertCurrentState> = {},
): AlertCurrentState {
  return {
    fingerprint: 'fp-node-a1',
    alertName: 'NodeCpuTempCritical',
    rawLabels: {
      alertname: 'NodeCpuTempCritical',
      node_id: 'node-a1',
    },
    rawAnnotations: {
      summary: 'Node hot',
    },
    severity: 'critical',
    status: 'firing',
    category: 'thermal',
    environment: 'lab',
    team: 'platform',
    source: 'grafana',
    summary: 'Node node-a1 CPU temperature 94C > 90C',
    description: 'Node node-a1 is too hot',
    metricKey: 'cpu_temp_celsius',
    observedWindow: '5m',
    dashboardUrl: '/d/monitoring-overview',
    runbookUrl: '/docs/runbooks/alerting/node-cpu-temp-critical',
    currentValue: '94',
    threshold: '90',
    startsAt: '2026-07-15T20:01:30Z',
    endsAt: null,
    lastReceivedAt: '2026-07-15T20:01:45.000Z',
    firstSyncedAt: '2026-07-15T20:01:45.000Z',
    lastSyncedAt: '2026-07-15T20:01:45.000Z',
    lastStatusChangedAt: '2026-07-15T20:01:45.000Z',
    scopeType: 'node',
    nodeId: 'node-a1',
    rackId: 'rack-a1',
    ...createDefaultAlertIncidentLinkage(),
    ...override,
  };
}

function buildIncident(
  override: Partial<IncidentWorkflowIncident> = {},
): IncidentWorkflowIncident {
  return {
    incidentId: 'incident-1',
    incidentCode: 'MON-ALERT-123',
    title: 'Incident title',
    severity: 'CRITICAL',
    status: 'OPEN',
    createdBy: {
      userId: 'user-1',
      username: 'ducpv',
      fullName: 'Pham Van Duc',
      source: 'monitoring_alert_handoff',
    },
    metadata: {
      fingerprint: 'fp-node-a1',
    },
    createdAt: '2026-07-16T01:00:00.000Z',
    updatedAt: '2026-07-16T01:00:00.000Z',
    ...override,
  };
}
