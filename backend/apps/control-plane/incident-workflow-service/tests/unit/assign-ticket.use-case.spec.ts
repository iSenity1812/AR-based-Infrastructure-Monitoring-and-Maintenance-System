import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { AssignTicketUseCase } from '../../src/use-cases/commands/ticket.commands';
import {
  BadRequestUseCaseError,
  ConflictUseCaseError,
} from '../../src/use-cases/errors/use-case.errors';

describe('AssignTicketUseCase', () => {
  it('assigns a ticket and records the activity', async () => {
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
      assigneeUserId: 'tech-1',
      status: TicketStatus.ASSIGNED,
      updatedAt: new Date('2026-06-20T00:10:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(updatedTicket),
    };

    const useCase = new AssignTicketUseCase(ticketRepository);
    const result = await useCase.execute('ticket-1', {
      actorUserId: 'dispatcher-1',
      assigneeUserId: 'tech-1',
      message: 'Please take this one.',
    });

    expect(result.props.assigneeUserId).toBe('tech-1');
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-1', {
      ownerUserId: 'dispatcher-1',
      assigneeUserId: 'tech-1',
      assignedAt: expect.any(Date),
      status: TicketStatus.ASSIGNED,
      activities: [
        expect.objectContaining({
          type: TicketActivityType.ASSIGNED,
          actorUserId: 'dispatcher-1',
          fromUserId: null,
          toUserId: 'tech-1',
          message: 'Please take this one.',
        }),
      ],
    });
  });

  it('rejects assignment for closed tickets', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.CLOSED,
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const useCase = new AssignTicketUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', {
        actorUserId: 'dispatcher-1',
        assigneeUserId: 'tech-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
  });

  it('rejects reassigning to the same assignee', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.ASSIGNED,
      assigneeUserId: 'tech-1',
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const useCase = new AssignTicketUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', {
        actorUserId: 'dispatcher-1',
        assigneeUserId: 'tech-1',
      }),
    ).rejects.toBeInstanceOf(ConflictUseCaseError);
  });
});
