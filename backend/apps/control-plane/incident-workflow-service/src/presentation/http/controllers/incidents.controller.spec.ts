import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import {
  IncidentEntity,
  type IncidentCapturedSnapshot,
} from '@domain/entities/incident.entity';
import {
  CreateIncidentUseCase,
  GetIncidentUseCase,
  ListIncidentsUseCase,
} from '@use-cases/commands/incident.commands';
import { IncidentsController } from './incidents.controller';

function buildSnapshot(): IncidentCapturedSnapshot {
  return {
    schemaVersion: 'incident.context.v1',
    capturedAt: '2026-07-23T04:18:45.000Z',
    window: {
      from: '2026-07-23T03:48:45.000Z',
      to: '2026-07-23T04:18:45.000Z',
      interval: '1m',
    },
    completeness: 'partial',
    unavailableSources: [
      {
        source: 'asset-service',
        reasonCode: 'TIMEOUT',
      },
    ],
    alert: {
      fingerprint: 'fp-1',
      alertName: 'NodeStale',
      severity: 'critical',
      category: 'availability',
      metricKey: 'node_stale_age_seconds',
      currentValue: '120',
      threshold: '60',
      startsAt: '2026-07-23T04:17:45.000Z',
      summary: 'Node node-1 stopped reporting fresh telemetry.',
    },
    scope: {
      scopeType: 'node',
      scopeId: 'node-1',
      rackId: 'rack-1',
    },
    asset: {
      displayName: 'Node 01',
      siteCode: 'SITE-01',
      roomCode: 'ROOM-01',
      rackCode: 'RACK-01',
    },
    impact: {
      affectedNodeCount: 1,
      totalNodeCount: 4,
      affectedRatio: 0.25,
    },
    metricEvidence: [
      {
        metricKey: 'node_stale_age_seconds',
        label: 'Node Stale Age',
        unit: 'seconds',
        lastValueNumeric: 120,
        observedAt: '2026-07-23T04:18:45.000Z',
      },
    ],
    sourceRefs: [
      {
        system: 'asset-service',
        dataset: 'nodes',
        observedAt: '2026-07-23T04:18:45.000Z',
      },
    ],
  };
}

function buildIncidentEntity(
  overrides: Partial<IncidentEntity['props']> = {},
): IncidentEntity {
  return new IncidentEntity({
    id: 'incident-1',
    incidentCode: 'INC-001',
    title: 'Node stale',
    description: 'Investigate node stale condition',
    severity: IncidentSeverity.CRITICAL,
    status: IncidentStatus.OPEN,
    ticketIds: ['ticket-1'],
    createdBy: {
      userId: 'user-1',
      username: 'admin01',
      fullName: 'Admin 01',
      source: 'incident_console',
    },
    metadata: {
      source: 'monitoring_alert',
      fingerprint: 'fp-1',
      alertName: 'NodeStale',
      monitoringSeverity: 'critical',
      scopeType: 'node',
      nodeId: 'node-1',
      rackId: 'rack-1',
      dashboardUrl: '/d/monitoring-overview',
      runbookUrl: '/docs/runbooks/alerting/node-stale',
      startsAt: '2026-07-23T04:17:45.000Z',
      lastReceivedAt: '2026-07-23T04:18:45.000Z',
      rawLabels: {
        critical_nodes_label: '1',
        silent_dead_nodes_label: '0',
      },
      rawAnnotations: {
        reason_code: 'node_stale',
      },
      summary: {
        whatHappened: 'Node node-1 stopped reporting fresh telemetry.',
        where: {
          scopeType: 'node',
          nodeId: 'node-1',
          rackId: 'rack-1',
        },
        urgency: 'review_now',
      },
    },
    capturedSnapshot: buildSnapshot(),
    createdAt: new Date('2026-07-23T04:20:00.000Z'),
    updatedAt: new Date('2026-07-23T04:21:00.000Z'),
    ...overrides,
  });
}

function buildCreateIncidentEntity(): IncidentEntity {
  return buildIncidentEntity({
    metadata: {
      source: 'monitoring_alert',
    },
    capturedSnapshot: {
      ...buildSnapshot(),
      unavailableSources: [
        {
          source: 'asset-service',
          reasonCode: 'TIMEOUT',
        },
      ],
      metricEvidence: [],
      sourceRefs: [],
      asset: undefined,
      impact: undefined,
      alert: {
        fingerprint: 'fp-1',
      },
    },
  });
}

describe('IncidentsController', () => {
  let createIncidentUseCase: jest.Mocked<CreateIncidentUseCase>;
  let listIncidentsUseCase: jest.Mocked<ListIncidentsUseCase>;
  let getIncidentUseCase: jest.Mocked<GetIncidentUseCase>;
  let controller: IncidentsController;

  beforeEach(() => {
    createIncidentUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateIncidentUseCase>;
    listIncidentsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListIncidentsUseCase>;
    getIncidentUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetIncidentUseCase>;

    controller = new IncidentsController(
      createIncidentUseCase,
      listIncidentsUseCase,
      getIncidentUseCase,
    );
  });

  it('returns a flat response for create and normalizes optional snapshot arrays', async () => {
    createIncidentUseCase.execute.mockResolvedValue(
      buildCreateIncidentEntity(),
    );

    const response = await controller.create(
      {
        incidentCode: 'INC-001',
        title: 'Node stale',
        description: 'Investigate node stale condition',
        severity: IncidentSeverity.CRITICAL,
        ticketIds: ['ticket-1'],
        metadata: {
          source: 'monitoring_alert',
        },
        capturedSnapshot: {
          ...buildSnapshot(),
          unavailableSources: undefined,
          metricEvidence: undefined,
          sourceRefs: undefined,
        },
      },
      {
        userId: 'user-1',
        username: 'admin01',
        fullName: 'Admin 01',
        sessionId: 'session-1',
        roles: [],
        permissions: [],
      },
    );

    const createCommand: Parameters<CreateIncidentUseCase['execute']>[0] =
      createIncidentUseCase.execute.mock.calls[0][0];
    expect(createCommand.capturedSnapshot?.unavailableSources).toEqual([]);
    expect(createCommand.capturedSnapshot?.metricEvidence).toEqual([]);
    expect(createCommand.capturedSnapshot?.sourceRefs).toEqual([]);
    expect(response).toEqual({
      id: 'incident-1',
      incidentCode: 'INC-001',
      title: 'Node stale',
      description: 'Investigate node stale condition',
      severity: IncidentSeverity.CRITICAL,
      status: IncidentStatus.OPEN,
      ticketIds: ['ticket-1'],
      createdBy: {
        userId: 'user-1',
        username: 'admin01',
        fullName: 'Admin 01',
        source: 'incident_console',
      },
      metadata: {
        source: 'monitoring_alert',
      },
      capturedSnapshot: buildCreateIncidentEntity().props.capturedSnapshot,
      createdAt: '2026-07-23T04:20:00.000Z',
      updatedAt: '2026-07-23T04:21:00.000Z',
    });
    expect(response).not.toHaveProperty('props');
  });

  it('returns a compact incident summary list', async () => {
    listIncidentsUseCase.execute.mockResolvedValue([
      buildIncidentEntity({
        capturedSnapshot: {
          ...buildSnapshot(),
          asset: {
            displayName: 'Node 01',
            siteCode: 'SITE-01',
            roomCode: 'ROOM-01',
          },
          impact: {
            affectedNodeCount: 1,
            totalNodeCount: 4,
            affectedRatio: 0.25,
          },
          alert: {
            fingerprint: 'fp-1',
            alertName: 'NodeStale',
            severity: 'critical',
            startsAt: '2026-07-23T04:17:45.000Z',
          },
        },
      }),
      buildIncidentEntity({
        id: 'incident-2',
        incidentCode: 'INC-002',
      }),
    ]);

    const response = await controller.list({
      incidentCode: 'INC',
      status: IncidentStatus.OPEN,
      scopeType: 'node',
      scopeId: 'node-1',
    });

    expect(listIncidentsUseCase.execute.mock.calls[0]?.[0]).toEqual({
      incidentCode: 'INC',
      status: IncidentStatus.OPEN,
      scopeType: 'node',
      scopeId: 'node-1',
    });
    expect(response).toHaveLength(2);
    expect(response[0]).toEqual({
      id: 'incident-1',
      incidentCode: 'INC-001',
      title: 'Node stale',
      severity: IncidentSeverity.CRITICAL,
      status: IncidentStatus.OPEN,
      summary: {
        whatHappened: 'Node node-1 stopped reporting fresh telemetry.',
        where: 'SITE-01 / ROOM-01 / Node 01',
        whatIsAffected: '1 of 4 nodes affected',
        urgency: 'review_now',
      },
      scope: {
        type: 'node',
        id: 'node-1',
        rackId: 'rack-1',
        nodeId: 'node-1',
      },
      asset: {
        displayName: 'Node 01',
        siteCode: 'SITE-01',
        roomCode: 'ROOM-01',
        rackCode: undefined,
      },
      impact: {
        affectedNodeCount: 1,
        totalNodeCount: 4,
        affectedRatio: 0.25,
        criticalNodeCount: 1,
        silentDeadNodeCount: 0,
      },
      primaryAlert: {
        fingerprint: 'fp-1',
        name: 'NodeStale',
        severity: 'critical',
        startedAt: '2026-07-23T04:17:45.000Z',
        lastReceivedAt: '2026-07-23T04:18:45.000Z',
      },
      ticketCount: 1,
      links: {
        dashboardUrl: '/d/monitoring-overview',
        runbookUrl: '/docs/runbooks/alerting/node-stale',
      },
      createdAt: '2026-07-23T04:20:00.000Z',
      updatedAt: '2026-07-23T04:21:00.000Z',
    });
    expect(response[0]).not.toHaveProperty('props');
    expect(response[0]).not.toHaveProperty('description');
    expect(response[0]).not.toHaveProperty('metadata');
    expect(response[0]).not.toHaveProperty('capturedSnapshot');
    expect(JSON.stringify(response[0])).not.toContain('rawLabels');
    expect(JSON.stringify(response[0])).not.toContain('rawAnnotations');
  });

  it('rejects partial scope filters for list', async () => {
    await expect(
      controller.list({
        scopeType: 'rack',
      }),
    ).rejects.toThrow('scopeType and scopeId must be provided together.');

    expect(listIncidentsUseCase.execute.mock.calls).toHaveLength(0);
  });

  it('returns a source-facts detail response for get', async () => {
    getIncidentUseCase.execute.mockResolvedValue({
      incident: buildIncidentEntity(),
      relatedIncidents: [
        buildIncidentEntity({
          id: 'incident-2',
          incidentCode: 'INC-002',
          title: 'Node stale previous',
          createdAt: new Date('2026-07-22T04:20:00.000Z'),
          updatedAt: new Date('2026-07-22T04:21:00.000Z'),
        }),
      ],
    });

    const response = await controller.get('incident-1');

    expect(response).toEqual({
      id: 'incident-1',
      incidentCode: 'INC-001',
      title: 'Node stale',
      state: {
        status: IncidentStatus.OPEN,
        severity: IncidentSeverity.CRITICAL,
        createdAt: '2026-07-23T04:20:00.000Z',
        updatedAt: '2026-07-23T04:21:00.000Z',
        resolvedAt: null,
        closedAt: null,
      },
      summary: {
        whatHappened: 'Node node-1 stopped reporting fresh telemetry.',
        scope: {
          type: 'node',
          id: 'node-1',
          rackId: 'rack-1',
          nodeId: 'node-1',
        },
        urgency: 'review_now',
      },
      sourceFacts: {
        alert: {
          fingerprint: 'fp-1',
          name: 'NodeStale',
          severity: 'critical',
          category: 'availability',
          environment: undefined,
          team: undefined,
          startedAt: '2026-07-23T04:17:45.000Z',
          lastReceivedAt: '2026-07-23T04:18:45.000Z',
        },
        trigger: {
          metricKey: 'node_stale_age_seconds',
          currentValue: 120,
          threshold: 60,
          unit: 'seconds',
          observedWindow: undefined,
        },
        asset: {
          displayName: 'Node 01',
          siteCode: 'SITE-01',
          roomCode: 'ROOM-01',
          rackCode: 'RACK-01',
        },
        impact: {
          affectedNodeCount: 1,
          totalNodeCount: 4,
          affectedRatio: 0.25,
          criticalNodeCount: 1,
          silentDeadNodeCount: 0,
        },
      },
      evidence: {
        type: 'creation_snapshot',
        capturedAt: '2026-07-23T04:18:45.000Z',
        window: {
          from: '2026-07-23T03:48:45.000Z',
          to: '2026-07-23T04:18:45.000Z',
          interval: '1m',
        },
        completeness: 'partial',
        metrics: [
          {
            metricKey: 'node_stale_age_seconds',
            label: 'Node Stale Age',
            value: 120,
            unit: 'seconds',
            observedAt: '2026-07-23T04:18:45.000Z',
          },
        ],
        unavailableSources: [
          {
            source: 'asset-service',
            reasonCode: 'TIMEOUT',
          },
        ],
      },
      alerts: [
        {
          fingerprint: 'fp-1',
          name: 'NodeStale',
          severity: 'critical',
          role: 'primary',
          startedAt: '2026-07-23T04:17:45.000Z',
          lastReceivedAt: '2026-07-23T04:18:45.000Z',
        },
      ],
      tickets: [
        {
          id: 'ticket-1',
        },
      ],
      links: {
        dashboardUrl: '/d/monitoring-overview',
        runbookUrl: '/docs/runbooks/alerting/node-stale',
      },
      sourceRefs: [
        {
          system: 'asset-service',
          dataset: 'nodes',
          observedAt: '2026-07-23T04:18:45.000Z',
        },
      ],
      relatedIncidents: [
        {
          id: 'incident-2',
          incidentCode: 'INC-002',
          title: 'Node stale previous',
          severity: IncidentSeverity.CRITICAL,
          status: IncidentStatus.OPEN,
          createdAt: '2026-07-22T04:20:00.000Z',
          updatedAt: '2026-07-22T04:21:00.000Z',
        },
      ],
    });
    expect(response).not.toHaveProperty('props');
    expect(response).not.toHaveProperty('description');
    expect(response).not.toHaveProperty('metadata');
    expect(response).not.toHaveProperty('capturedSnapshot');
    expect(response).not.toHaveProperty('recommendedActions');
    expect(response).not.toHaveProperty('diagnosis');
    expect(JSON.stringify(response)).not.toContain('rawLabels');
    expect(JSON.stringify(response)).not.toContain('rawAnnotations');
  });
});
