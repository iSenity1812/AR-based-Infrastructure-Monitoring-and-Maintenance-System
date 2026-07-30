import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import { IncidentEntity } from '@domain/entities/incident.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import type { TicketRepositoryPort } from '@domain/ports/ticket-repository.port';
import { ForbiddenUseCaseError } from '@use-cases/errors/use-case.errors';
import { GetIncidentUseCase } from './incident.commands';

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
    metadata: {
      source: 'monitoring_alert',
      scopeType: 'node',
      nodeId: 'node-1',
    },
    capturedSnapshot: {
      schemaVersion: 'incident.context.v1',
      capturedAt: '2026-07-23T04:18:45.000Z',
      window: {
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
        interval: '1m',
      },
      completeness: 'complete',
      unavailableSources: [],
      alert: { fingerprint: 'fp-1' },
      scope: {
        scopeType: 'node',
        scopeId: 'node-1',
        rackId: 'rack-1',
      },
      metricEvidence: [],
      sourceRefs: [],
    },
    createdAt: new Date('2026-07-23T04:20:00.000Z'),
    updatedAt: new Date('2026-07-23T04:21:00.000Z'),
    ...overrides,
  });
}

describe('GetIncidentUseCase', () => {
  function buildTicketRepository(
    overrides: Partial<jest.Mocked<TicketRepositoryPort>> = {},
  ): jest.Mocked<TicketRepositoryPort> {
    return {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
      ...overrides,
    };
  }

  it('returns related incidents for the same scope and excludes the current incident', async () => {
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildIncidentEntity()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn().mockResolvedValue([
        buildIncidentEntity({
          id: 'incident-2',
          incidentCode: 'INC-002',
          title: 'Node stale previous',
        }),
      ]),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository();

    const useCase = new GetIncidentUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute('incident-1', {
      userId: 'operator-1',
      permissions: [PERMISSION_CODES.INCIDENTS_READ],
    });

    expect(ticketRepository.findMany.mock.calls).toHaveLength(0);
    expect(incidentRepository.findRelatedByScope.mock.calls[0]?.[0]).toEqual({
      scopeType: 'node',
      scopeId: 'node-1',
      excludeIncidentId: 'incident-1',
      limit: 10,
    });
    expect(result.relatedIncidents).toHaveLength(1);
    expect(result.relatedIncidents[0]?.props.incidentCode).toBe('INC-002');
  });

  it('returns an empty related incident list when scope cannot be derived', async () => {
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        buildIncidentEntity({
          metadata: {},
          capturedSnapshot: undefined,
        }),
      ),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository();

    const useCase = new GetIncidentUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute('incident-1', {
      userId: 'operator-1',
      permissions: [PERMISSION_CODES.INCIDENTS_READ],
    });

    expect(result.relatedIncidents).toEqual([]);
    expect(incidentRepository.findRelatedByScope.mock.calls).toHaveLength(0);
  });

  it('allows a technician to inspect an incident linked to their assigned ticket', async () => {
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildIncidentEntity()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository({
      findMany: jest.fn().mockResolvedValue([{ props: { id: 'ticket-1' } }]),
    });

    const useCase = new GetIncidentUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute('incident-1', {
      userId: 'technician-1',
      permissions: [],
    });

    expect(ticketRepository.findMany.mock.calls[0]?.[0]).toEqual({
      incidentId: 'incident-1',
      assigneeUserId: 'technician-1',
    });
    expect(result.incident.props.id).toBe('incident-1');
  });

  it('rejects a technician inspecting an incident without an assigned linked ticket', async () => {
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildIncidentEntity()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository();

    const useCase = new GetIncidentUseCase(
      incidentRepository,
      ticketRepository,
    );

    await expect(
      useCase.execute('incident-1', {
        userId: 'technician-1',
        permissions: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenUseCaseError);

    expect(incidentRepository.findRelatedByScope.mock.calls).toHaveLength(0);
  });
});
