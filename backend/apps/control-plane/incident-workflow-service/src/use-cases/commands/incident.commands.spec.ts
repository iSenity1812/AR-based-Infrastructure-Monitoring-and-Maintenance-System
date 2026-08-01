import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { PERMISSION_CODES } from '@domain/constants/permission-code.constant';
import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { IncidentEntity } from '@domain/entities/incident.entity';
import { TicketEntity } from '@domain/entities/ticket.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import type { TicketRepositoryPort } from '@domain/ports/ticket-repository.port';
import { ForbiddenUseCaseError } from '@use-cases/errors/use-case.errors';
import { TransitionTicketStatusUseCase } from './ticket.commands';
import { GetIncidentUseCase, ListIncidentsUseCase } from './incident.commands';

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

function buildTicketEntity(
  overrides: Partial<TicketEntity['props']> = {},
): TicketEntity {
  return new TicketEntity({
    id: 'ticket-1',
    ticketCode: 'TICKET-001',
    title: 'Investigate node stale',
    priority: TicketPriority.HIGH,
    status: TicketStatus.IN_PROGRESS,
    incidentId: 'incident-1',
    createdAt: new Date('2026-07-23T04:20:30.000Z'),
    updatedAt: new Date('2026-07-23T04:21:30.000Z'),
    ...overrides,
  });
}

describe('Incident use cases', () => {
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

  it('enriches listed incidents with linked ticket records', async () => {
    const incident = buildIncidentEntity();
    const ticket = buildTicketEntity();
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn().mockResolvedValue([incident]),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository({
      findMany: jest.fn().mockResolvedValue([ticket]),
      findById: jest.fn(),
    });
    const useCase = new ListIncidentsUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute({ status: IncidentStatus.OPEN });

    expect(incidentRepository.findMany.mock.calls[0]?.[0]).toEqual({
      status: IncidentStatus.OPEN,
    });
    expect(ticketRepository.findMany.mock.calls[0]?.[0]).toEqual({
      incidentId: 'incident-1',
    });
    expect(ticketRepository.findById.mock.calls).toHaveLength(0);
    expect(result).toEqual([{ incident, tickets: [ticket] }]);
  });

  it('excludes incidents by effective linked-ticket status', async () => {
    const incident = buildIncidentEntity({
      status: IncidentStatus.OPEN,
      ticketIds: ['ticket-1'],
    });
    const closedTicket = buildTicketEntity({
      status: TicketStatus.CLOSED,
      incidentId: 'incident-1',
    });
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn().mockResolvedValue([incident]),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository({
      findMany: jest.fn().mockResolvedValue([closedTicket]),
      findById: jest.fn(),
    });
    const useCase = new ListIncidentsUseCase(
      incidentRepository,
      ticketRepository,
    );

    const result = await useCase.execute({
      excludeStatus: [IncidentStatus.CLOSED],
    });

    expect(incidentRepository.findMany.mock.calls[0]?.[0]).toEqual({});
    expect(result).toEqual([]);
  });

  it('marks a linked incident as resolved when every linked ticket is resolved or closed', async () => {
    const incident = buildIncidentEntity();
    const ticket = buildTicketEntity({
      status: TicketStatus.IN_PROGRESS,
      assigneeUserId: 'technician-1',
      acknowledgedAt: new Date('2026-07-23T04:25:00.000Z'),
    });
    const resolvedTicket = buildTicketEntity({
      status: TicketStatus.RESOLVED,
      assigneeUserId: 'technician-1',
      acknowledgedAt: ticket.props.acknowledgedAt,
    });
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(incident),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository({
      findById: jest.fn().mockResolvedValue(ticket),
      findMany: jest.fn().mockResolvedValue([resolvedTicket]),
      update: jest.fn().mockResolvedValue(resolvedTicket),
    });
    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      incidentRepository,
    );

    await useCase.execute('ticket-1', TicketStatus.RESOLVED, {
      actorUserId: 'technician-1',
    });

    expect(incidentRepository.update.mock.calls[0]).toEqual([
      'incident-1',
      {
        status: IncidentStatus.RESOLVED,
      },
    ]);
  });

  it('marks a linked incident as closed when every linked ticket is closed', async () => {
    const incident = buildIncidentEntity();
    const ticket = buildTicketEntity({
      status: TicketStatus.RESOLVED,
      assigneeUserId: 'technician-1',
      acknowledgedAt: new Date('2026-07-23T04:25:00.000Z'),
    });
    const closedTicket = buildTicketEntity({
      status: TicketStatus.CLOSED,
      assigneeUserId: 'technician-1',
      acknowledgedAt: ticket.props.acknowledgedAt,
    });
    const incidentRepository: jest.Mocked<IncidentRepositoryPort> = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(incident),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
    const ticketRepository = buildTicketRepository({
      findById: jest.fn().mockResolvedValue(ticket),
      findMany: jest.fn().mockResolvedValue([closedTicket]),
      update: jest.fn().mockResolvedValue(closedTicket),
    });
    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      incidentRepository,
    );

    await useCase.execute('ticket-1', TicketStatus.CLOSED, {
      actorUserId: 'technician-1',
    });

    expect(incidentRepository.update.mock.calls[0]).toEqual([
      'incident-1',
      {
        status: IncidentStatus.CLOSED,
      },
    ]);
  });

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
