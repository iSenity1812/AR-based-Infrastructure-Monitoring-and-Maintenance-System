import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { IncidentEntity } from '../../src/domain/entities/incident.entity';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { CreateTicketUseCase } from '../../src/use-cases/commands/ticket.commands';
import { IncidentStatus } from '../../src/domain/constants/incident-status.enum';
import { IncidentSeverity } from '../../src/domain/constants/incident-severity.enum';
import {
  ConflictUseCaseError,
  NotFoundUseCaseError,
} from '../../src/use-cases/errors/use-case.errors';

describe('CreateTicketUseCase', () => {
  it('creates an open ticket and links it to an incident when provided', async () => {
    const incident = new IncidentEntity({
      id: 'incident-1',
      incidentCode: 'INC-001',
      title: 'Database latency',
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.OPEN,
      ticketIds: [],
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });
    const createdTicket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      incidentId: 'incident-1',
      createdAt: new Date('2026-06-20T00:01:00.000Z'),
      updatedAt: new Date('2026-06-20T00:01:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn().mockResolvedValue(createdTicket),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const incidentRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(incident),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({
        ...incident,
        props: {
          ...incident.props,
          ticketIds: ['ticket-1'],
        },
      }),
    };

    const useCase = new CreateTicketUseCase(
      ticketRepository,
      incidentRepository,
    );

    const result = await useCase.execute({
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      incidentId: 'incident-1',
    });

    expect(result).toBe(createdTicket);
    expect(ticketRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketCode: 'TCK-001',
        priority: TicketPriority.HIGH,
        status: 'OPEN',
        incidentId: 'incident-1',
      }),
    );
    expect(incidentRepository.update).toHaveBeenCalledWith('incident-1', {
      ticketIds: ['ticket-1'],
    });
  });

  it('rejects duplicate ticket codes', async () => {
    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(
        new TicketEntity({
          id: 'ticket-dup',
          ticketCode: 'TCK-001',
          title: 'Existing ticket',
          priority: TicketPriority.MEDIUM,
          status: TicketStatus.OPEN,
          createdAt: new Date('2026-06-20T00:00:00.000Z'),
          updatedAt: new Date('2026-06-20T00:00:00.000Z'),
        }),
      ),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const incidentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new CreateTicketUseCase(
      ticketRepository,
      incidentRepository,
    );

    await expect(
      useCase.execute({
        ticketCode: 'TCK-001',
        title: 'Investigate DB latency',
        priority: TicketPriority.HIGH,
      }),
    ).rejects.toBeInstanceOf(ConflictUseCaseError);
  });

  it('rejects unknown incident ids', async () => {
    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const incidentRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new CreateTicketUseCase(
      ticketRepository,
      incidentRepository,
    );

    await expect(
      useCase.execute({
        ticketCode: 'TCK-002',
        title: 'Investigate DB latency',
        priority: TicketPriority.HIGH,
        incidentId: 'incident-missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundUseCaseError);
  });
});
