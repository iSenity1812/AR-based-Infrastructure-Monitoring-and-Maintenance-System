import { describe, expect, it, jest } from '@jest/globals';

import type { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import type { IncidentWorkflowClientPort } from '../ports/incident-workflow-client.port';
import type { MonitoringEventRepository } from '../ports/monitoring-event.repository';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import { MonitoringIncidentPolicyService } from '../services/monitoring-incident-policy.service';
import { MonitoringWorkflowSystemAuthService } from '../services/monitoring-workflow-system-auth.service';
import { SyncExternalAlertsUseCase } from './sync-external-alerts.use-case';
import { CreateIncidentFromAlertUseCase } from './create-incident-from-alert.use-case';

describe('SyncExternalAlertsUseCase', () => {
  it('persists mapped alerts and reports invalid items', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
      updateIncidentLinkage: jest.fn(),
    };

    const useCase = new SyncExternalAlertsUseCase(
      repository,
      createMonitoringEventRepository(),
      createIncidentUseCase(),
      new MonitoringIncidentPolicyService(new MonitoringServiceConfig({})),
      createSystemAuthService(),
      createIncidentWorkflowClient(),
    );

    const result = await useCase.execute({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'firing',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
        {
          fingerprint: 'fp-2',
          status: 'firing',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'null',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'null',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
      ],
    });

    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'fp-1',
        rawLabels: expect.objectContaining({
          rack_id: 'rack-a1',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        totalReceived: 2,
        synced: 1,
        invalid: 1,
        skipped: 0,
      }),
    );
  });

  it('preserves firstSyncedAt when updating an existing alert', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn().mockResolvedValue({
        fingerprint: 'fp-1',
        alertName: 'RackSignalLossPresent',
        rawLabels: { rack_id: 'rack-a1' },
        rawAnnotations: { summary: 'old' },
        scopeType: 'rack',
        rackId: 'rack-a1',
        severity: 'critical',
        status: 'firing',
        category: 'connectivity',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'old',
        description: 'old',
        metricKey: null,
        observedWindow: null,
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: null,
        threshold: null,
        startsAt: '2026-07-14T13:12:50Z',
        endsAt: null,
        lastReceivedAt: '2026-07-15T00:00:00.000Z',
        firstSyncedAt: '2026-07-15T00:00:00.000Z',
        lastSyncedAt: '2026-07-15T00:00:00.000Z',
        lastStatusChangedAt: '2026-07-15T00:00:00.000Z',
      }),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
      updateIncidentLinkage: jest.fn(),
    };

    const useCase = new SyncExternalAlertsUseCase(
      repository,
      createMonitoringEventRepository(),
      createIncidentUseCase(),
      new MonitoringIncidentPolicyService(new MonitoringServiceConfig({})),
      createSystemAuthService(),
      createIncidentWorkflowClient(),
    );

    await useCase.execute({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'resolved',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: '2026-07-14T13:14:50Z',
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
      ],
    });

    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        firstSyncedAt: '2026-07-15T00:00:00.000Z',
        status: 'resolved',
      }),
    );
  });

  it('creates an incident and ticket automatically for allowlisted alerts', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      updateIncidentLinkage: jest.fn(),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
    };
    const createIncidentFromAlertUseCase = createIncidentUseCase();
    const incidentWorkflowClient = createIncidentWorkflowClient();
    const useCase = new SyncExternalAlertsUseCase(
      repository,
      createMonitoringEventRepository(),
      createIncidentFromAlertUseCase,
      new MonitoringIncidentPolicyService(new MonitoringServiceConfig({})),
      createSystemAuthService(),
      incidentWorkflowClient,
    );

    await useCase.execute({
      receivedAt: '2026-07-22T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'availability',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'firing',
          startsAt: '2026-07-22T00:55:00.000Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'RackCritical',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack critical',
          },
          rawLabels: {
            alertname: 'RackCritical',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack critical',
          },
        },
      ],
    });

    expect(createIncidentFromAlertUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'fp-1',
        severityOverride: 'CRITICAL',
      }),
    );
    expect(incidentWorkflowClient.createTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketCode: 'MON-TICKET-858C06CF9C505C9F135E64D506F2E40D',
        priority: 'CRITICAL',
      }),
    );
  });

  it('appends alert fired and resolved timeline events only on real transitions', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          fingerprint: 'fp-1',
          alertName: 'NodeStale',
          rawLabels: { node_id: 'node-a1', rack_id: 'rack-a' },
          rawAnnotations: { reason_code: 'stale_snapshot' },
          scopeType: 'node',
          nodeId: 'node-a1',
          rackId: 'rack-a',
          severity: 'warning',
          status: 'firing',
          category: 'availability',
          environment: 'lab',
          team: 'infra',
          source: 'grafana',
          summary: 'Node stale',
          description: 'Node stale',
          metricKey: 'stale_age_sec',
          observedWindow: '120s',
          dashboardUrl: null,
          runbookUrl: null,
          currentValue: '14543',
          threshold: '120',
          startsAt: '2026-07-22T07:21:30.000Z',
          endsAt: null,
          lastReceivedAt: '2026-07-22T07:22:00.000Z',
          firstSyncedAt: '2026-07-22T07:22:00.000Z',
          lastSyncedAt: '2026-07-22T07:22:00.000Z',
          lastStatusChangedAt: '2026-07-22T07:21:30.000Z',
          triageStatus: 'new',
          incidentId: null,
          incidentCode: null,
          incidentStatus: null,
          incidentSeverity: null,
          incidentTitle: null,
          incidentCreatedAt: null,
          incidentLinkedAt: null,
          lastEscalatedAt: null,
        }),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
      updateIncidentLinkage: jest.fn(),
    };
    const monitoringEventRepository = createMonitoringEventRepository();
    const useCase = new SyncExternalAlertsUseCase(
      repository,
      monitoringEventRepository,
      createIncidentUseCase(),
      new MonitoringIncidentPolicyService(new MonitoringServiceConfig({})),
      createSystemAuthService(),
      createIncidentWorkflowClient(),
    );

    await useCase.execute({
      receivedAt: '2026-07-22T07:22:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'availability',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'firing',
          startsAt: '2026-07-22T07:21:30.000Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          annotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
          rawLabels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          rawAnnotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
        },
        {
          fingerprint: 'fp-1',
          status: 'resolved',
          startsAt: '2026-07-22T07:21:30.000Z',
          endsAt: '2026-07-22T07:25:00.000Z',
          generatorUrl: null,
          labels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          annotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
          rawLabels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          rawAnnotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
        },
      ],
    });

    expect(monitoringEventRepository.append).toHaveBeenCalledTimes(2);
    expect(monitoringEventRepository.append).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'alert.fired',
        scopeType: 'node',
        scopeId: 'node-a1',
      }),
    );
    expect(monitoringEventRepository.append).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'alert.resolved',
        scopeType: 'node',
        scopeId: 'node-a1',
      }),
    );
  });

  it('does not append timeline events when the alert status is unchanged', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn().mockResolvedValue({
        fingerprint: 'fp-1',
        alertName: 'NodeStale',
        rawLabels: { node_id: 'node-a1', rack_id: 'rack-a' },
        rawAnnotations: { reason_code: 'stale_snapshot' },
        scopeType: 'node',
        nodeId: 'node-a1',
        rackId: 'rack-a',
        severity: 'warning',
        status: 'firing',
        category: 'availability',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'Node stale',
        description: 'Node stale',
        metricKey: 'stale_age_sec',
        observedWindow: '120s',
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: '14543',
        threshold: '120',
        startsAt: '2026-07-22T07:21:30.000Z',
        endsAt: null,
        lastReceivedAt: '2026-07-22T07:22:00.000Z',
        firstSyncedAt: '2026-07-22T07:22:00.000Z',
        lastSyncedAt: '2026-07-22T07:22:00.000Z',
        lastStatusChangedAt: '2026-07-22T07:21:30.000Z',
        triageStatus: 'new',
        incidentId: null,
        incidentCode: null,
        incidentStatus: null,
        incidentSeverity: null,
        incidentTitle: null,
        incidentCreatedAt: null,
        incidentLinkedAt: null,
        lastEscalatedAt: null,
      }),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
      updateIncidentLinkage: jest.fn(),
    };
    const monitoringEventRepository = createMonitoringEventRepository();
    const useCase = new SyncExternalAlertsUseCase(
      repository,
      monitoringEventRepository,
      createIncidentUseCase(),
      new MonitoringIncidentPolicyService(new MonitoringServiceConfig({})),
      createSystemAuthService(),
      createIncidentWorkflowClient(),
    );

    await useCase.execute({
      receivedAt: '2026-07-22T07:23:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'availability',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'firing',
          startsAt: '2026-07-22T07:21:30.000Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          annotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
          rawLabels: {
            alertname: 'NodeStale',
            scope_type: 'node',
            node_id: 'node-a1',
            rack_id: 'rack-a',
            severity: 'warning',
          },
          rawAnnotations: {
            summary: 'Node stale',
            reason_code: 'stale_snapshot',
          },
        },
      ],
    });

    expect(monitoringEventRepository.append).not.toHaveBeenCalled();
  });
});

function createIncidentUseCase(): Pick<
  CreateIncidentFromAlertUseCase,
  'execute'
> {
  return {
    execute: jest.fn().mockResolvedValue({
      fingerprint: 'fp-1',
      action: 'created',
      triageStatus: 'incident_created',
      alert: {
        alertName: 'RackCritical',
        scopeType: 'rack',
        rackId: 'rack-a1',
        severity: 'critical',
        status: 'firing',
        category: 'availability',
        summary: 'Rack critical',
        startsAt: '2026-07-22T00:55:00.000Z',
        lastReceivedAt: '2026-07-22T01:00:00.000Z',
      },
      incident: {
        incidentId: 'incident-1',
        incidentCode: 'MON-ALERT-858C06CF9C505C9F135E64D506F2E40D',
        status: 'OPEN',
        severity: 'CRITICAL',
        title: 'Rack critical',
        createdAt: '2026-07-22T01:00:01.000Z',
        linkedAt: '2026-07-22T01:00:01.000Z',
      },
    }),
  };
}

function createIncidentWorkflowClient(): IncidentWorkflowClientPort {
  return {
    createIncident: jest.fn(),
    findIncidentByCode: jest.fn(),
    createTicket: jest.fn().mockResolvedValue({
      ticketId: 'ticket-1',
      ticketCode: 'MON-TICKET-858C06CF9C505C9F135E64D506F2E40D',
      title: 'Rack critical',
      priority: 'CRITICAL',
      status: 'OPEN',
      incidentId: 'incident-1',
    }),
  };
}

function createSystemAuthService(): Pick<
  MonitoringWorkflowSystemAuthService,
  'createSystemAuthContext'
> {
  return {
    createSystemAuthContext: jest.fn().mockResolvedValue({
      authorizationHeader: 'Bearer token',
      actor: {
        userId: 'system-monitoring-service',
        username: 'monitoring-service',
        fullName: 'Monitoring Service',
        sessionId: 'system-monitoring-service-session',
      },
    }),
  };
}

function createMonitoringEventRepository(): MonitoringEventRepository {
  return {
    append: jest.fn().mockResolvedValue({ inserted: true }),
    listByScopeAndWindow: jest.fn(),
  };
}
