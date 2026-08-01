import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import type { IncidentRepositoryPort } from '../../src/domain/ports/incident-repository.port';
import { TransitionTicketStatusUseCase } from '../../src/use-cases/commands/ticket.commands';
import {
  BadRequestUseCaseError,
  ForbiddenUseCaseError,
} from '../../src/use-cases/errors/use-case.errors';

describe('TransitionTicketStatusUseCase', () => {
  function buildIncidentRepository(): jest.Mocked<IncidentRepositoryPort> {
    return {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };
  }

  it('moves a ticket through the allowed lifecycle', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });

    const updatedTicket = new TicketEntity({
      ...ticket.props,
      status: TicketStatus.ASSIGNED,
      updatedAt: new Date('2026-06-20T00:10:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(updatedTicket),
      delete: jest.fn(),
    };

    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      buildIncidentRepository(),
    );
    const result = await useCase.execute('ticket-1', TicketStatus.ASSIGNED);

    expect(result.props.status).toBe(TicketStatus.ASSIGNED);
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-1', {
      status: TicketStatus.ASSIGNED,
      activities: [
        expect.objectContaining({
          type: TicketActivityType.STATUS_CHANGED,
          message: 'OPEN -> ASSIGNED',
        }),
      ],
    });
  });

  it('rejects invalid lifecycle transitions', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      buildIncidentRepository(),
    );

    await expect(
      useCase.execute('ticket-1', TicketStatus.CLOSED),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(ticketRepository.update).not.toHaveBeenCalled();
  });

  it('allows only the assigned acknowledged technician to resolve a ticket', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-2',
      ticketCode: 'TCK-002',
      title: 'Inspect field cabinet',
      priority: TicketPriority.HIGH,
      status: TicketStatus.ASSIGNED,
      assigneeUserId: 'technician-1',
      acknowledgedAt: new Date('2026-06-20T00:05:00.000Z'),
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:05:00.000Z'),
    });

    const updatedTicket = new TicketEntity({
      ...ticket.props,
      status: TicketStatus.RESOLVED,
      updatedAt: new Date('2026-06-20T00:15:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(updatedTicket),
      delete: jest.fn(),
    };

    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      buildIncidentRepository(),
    );
    const result = await useCase.execute('ticket-2', TicketStatus.RESOLVED, {
      actorUserId: 'technician-1',
    });

    expect(result.props.status).toBe(TicketStatus.RESOLVED);
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-2', {
      status: TicketStatus.RESOLVED,
      activities: [
        expect.objectContaining({
          type: TicketActivityType.STATUS_CHANGED,
          actorUserId: 'technician-1',
          message: 'ASSIGNED -> RESOLVED',
        }),
      ],
    });
  });

  it('rejects resolve when the actor is not the assigned technician', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-3',
      ticketCode: 'TCK-003',
      title: 'Inspect power unit',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.ASSIGNED,
      assigneeUserId: 'technician-1',
      acknowledgedAt: new Date('2026-06-20T00:05:00.000Z'),
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:05:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      buildIncidentRepository(),
    );

    await expect(
      useCase.execute('ticket-3', TicketStatus.RESOLVED, {
        actorUserId: 'technician-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenUseCaseError);
    expect(ticketRepository.update).not.toHaveBeenCalled();
  });

  it('rejects resolve when the ticket has not been acknowledged', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-4',
      ticketCode: 'TCK-004',
      title: 'Inspect cooling fan',
      priority: TicketPriority.LOW,
      status: TicketStatus.ASSIGNED,
      assigneeUserId: 'technician-1',
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:05:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const useCase = new TransitionTicketStatusUseCase(
      ticketRepository,
      buildIncidentRepository(),
    );

    await expect(
      useCase.execute('ticket-4', TicketStatus.RESOLVED, {
        actorUserId: 'technician-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(ticketRepository.update).not.toHaveBeenCalled();
  });
});
