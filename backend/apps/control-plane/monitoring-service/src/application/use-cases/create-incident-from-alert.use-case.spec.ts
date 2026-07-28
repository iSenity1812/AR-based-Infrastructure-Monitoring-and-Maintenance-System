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
import { IncidentContextSnapshotComposerService } from '../services/incident-context-snapshot-composer.service';
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
        capturedSnapshot: expect.objectContaining({
          schemaVersion: 'incident.context.v1',
          scope: expect.objectContaining({
            scopeType: 'node',
            scopeId: 'node-a1',
          }),
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

  it('creates a rack incident with a captured rack snapshot', async () => {
    const alert = buildAlert({
      fingerprint: 'fp-rack-a1',
      alertName: 'RackCritical',
      severity: 'critical',
      summary: 'Rack severity critical',
      description: 'Rack critical',
      metricKey: 'rack_severity_code',
      currentValue: '3',
      threshold: '3',
      scopeType: 'rack',
      rackId: 'rack-a1',
    } as Partial<AlertCurrentState> as AlertCurrentState);
    const incident = buildIncident({
      incidentCode: buildIncidentCodeFromAlertFingerprint(alert.fingerprint),
      metadata: {
        fingerprint: alert.fingerprint,
      },
    });
    const { useCase, incidentClient, snapshotComposer } = setup({
      alert,
      createdIncident: incident,
    });
    snapshotComposer.composeRackSnapshot = jest
      .fn()
      .mockResolvedValue({
        schemaVersion: 'incident.context.v1',
        capturedAt: '2026-07-23T04:18:45.000Z',
        window: {
          from: '2026-07-23T03:48:45.000Z',
          to: '2026-07-23T04:18:45.000Z',
          interval: '1m',
        },
        completeness: 'complete',
        unavailableSources: [],
        alert: {
          fingerprint: 'fp-rack-a1',
          alertName: 'RackCritical',
          category: 'availability',
          severity: 'critical',
          metricKey: 'rack_severity_code',
          currentValue: '3',
          threshold: '3',
          startsAt: '2026-07-15T20:01:30Z',
          summary: 'Rack severity critical',
        },
        scope: {
          scopeType: 'rack',
          scopeId: 'rack-a1',
          rackId: 'rack-a1',
        },
        asset: {
          rackId: 'rack-a1',
          rackCode: 'LOCAL-LAB-01',
          displayName: 'Local Lab Rack 01',
        },
        impact: {
          affectedNodeCount: 4,
          totalNodeCount: 10,
          affectedRatio: 0.4,
        },
        metricEvidence: [],
        sourceRefs: [],
      });

    await useCase.execute({
      fingerprint: alert.fingerprint,
      authorizationHeader: 'Bearer token',
      actor: buildActor(),
    });

    expect(snapshotComposer.composeRackSnapshot).toHaveBeenCalled();
    expect(incidentClient.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        capturedSnapshot: expect.objectContaining({
          scope: expect.objectContaining({
            scopeType: 'rack',
            scopeId: 'rack-a1',
          }),
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
  const snapshotComposer = {
    composeNodeSnapshot:
      jest.fn<IncidentContextSnapshotComposerService['composeNodeSnapshot']>(
        async () => ({
          schemaVersion: 'incident.context.v1',
          capturedAt: '2026-07-23T04:18:45.000Z',
          window: {
            from: '2026-07-23T03:48:45.000Z',
            to: '2026-07-23T04:18:45.000Z',
            interval: '1m',
          },
          completeness: 'complete',
          unavailableSources: [],
          alert: {
            fingerprint: 'fp-node-a1',
            alertName: 'NodeCpuTempCritical',
            category: 'thermal',
            severity: 'critical',
            metricKey: 'cpu_temp_celsius',
            currentValue: '94',
            threshold: '90',
            startsAt: '2026-07-15T20:01:30Z',
            summary: 'Node node-a1 CPU temperature 94C > 90C',
          },
          scope: {
            scopeType: 'node',
            scopeId: 'node-a1',
            rackId: 'rack-a1',
          },
          metricEvidence: [],
          sourceRefs: [],
        }),
      ),
    composeRackSnapshot:
      jest.fn<IncidentContextSnapshotComposerService['composeRackSnapshot']>(
        async () => ({
          schemaVersion: 'incident.context.v1',
          capturedAt: '2026-07-23T04:18:45.000Z',
          window: {
            from: '2026-07-23T03:48:45.000Z',
            to: '2026-07-23T04:18:45.000Z',
            interval: '1m',
          },
          completeness: 'complete',
          unavailableSources: [],
          alert: {
            fingerprint: 'fp-rack-a1',
            alertName: 'RackCritical',
            category: 'availability',
            severity: 'critical',
            metricKey: 'rack_severity_code',
            currentValue: '3',
            threshold: '3',
            startsAt: '2026-07-15T20:01:30Z',
            summary: 'Rack severity critical',
          },
          scope: {
            scopeType: 'rack',
            scopeId: 'rack-a1',
            rackId: 'rack-a1',
          },
          metricEvidence: [],
          sourceRefs: [],
        }),
      ),
  } as unknown as jest.Mocked<IncidentContextSnapshotComposerService>;

  return {
    repository,
    incidentClient,
    auditRepository,
    snapshotComposer,
    useCase: new CreateIncidentFromAlertUseCase(
      repository,
      incidentClient,
      auditRepository,
      snapshotComposer,
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
