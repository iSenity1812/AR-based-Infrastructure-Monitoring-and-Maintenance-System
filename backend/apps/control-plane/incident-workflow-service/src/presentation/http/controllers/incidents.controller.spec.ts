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
    },
    scope: {
      scopeType: 'node',
      scopeId: 'node-1',
      rackId: 'rack-1',
    },
    metricEvidence: [],
    sourceRefs: [],
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
    },
    capturedSnapshot: buildSnapshot(),
    createdAt: new Date('2026-07-23T04:20:00.000Z'),
    updatedAt: new Date('2026-07-23T04:21:00.000Z'),
    ...overrides,
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
    createIncidentUseCase.execute.mockResolvedValue(buildIncidentEntity());

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

    expect(createIncidentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        capturedSnapshot: expect.objectContaining({
          unavailableSources: [],
          metricEvidence: [],
          sourceRefs: [],
        }),
      }),
    );
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
      capturedSnapshot: buildSnapshot(),
      createdAt: '2026-07-23T04:20:00.000Z',
      updatedAt: '2026-07-23T04:21:00.000Z',
    });
    expect(response).not.toHaveProperty('props');
  });

  it('returns a flat response list', async () => {
    listIncidentsUseCase.execute.mockResolvedValue([
      buildIncidentEntity(),
      buildIncidentEntity({
        id: 'incident-2',
        incidentCode: 'INC-002',
      }),
    ]);

    const response = await controller.list({
      incidentCode: 'INC',
      status: IncidentStatus.OPEN,
    });

    expect(response).toHaveLength(2);
    expect(response[0]).toEqual(
      expect.objectContaining({
        id: 'incident-1',
        incidentCode: 'INC-001',
      }),
    );
    expect(response[0]).not.toHaveProperty('props');
  });

  it('returns a flat response for get', async () => {
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
    } as never);

    const response = await controller.get('incident-1');

    expect(response).toEqual(
      expect.objectContaining({
        id: 'incident-1',
        incidentCode: 'INC-001',
        capturedSnapshot: buildSnapshot(),
        relatedIncidents: [
          expect.objectContaining({
            id: 'incident-2',
            incidentCode: 'INC-002',
            title: 'Node stale previous',
          }),
        ],
      }),
    );
    expect(response).not.toHaveProperty('props');
  });
});
