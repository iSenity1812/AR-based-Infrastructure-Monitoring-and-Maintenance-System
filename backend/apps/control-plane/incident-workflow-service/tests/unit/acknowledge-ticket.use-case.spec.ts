import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { AcknowledgeTicketUseCase } from '../../src/use-cases/commands/ticket.commands';
import {
  BadRequestUseCaseError,
  ForbiddenUseCaseError,
} from '../../src/use-cases/errors/use-case.errors';

describe('AcknowledgeTicketUseCase', () => {
  it('marks an assigned ticket as acknowledged by the assignee', async () => {
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

    const updatedTicket = new TicketEntity({
      ...ticket.props,
      status: TicketStatus.IN_PROGRESS,
      acknowledgedAt: new Date('2026-06-20T00:15:00.000Z'),
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

    const useCase = new AcknowledgeTicketUseCase(ticketRepository);
    const result = await useCase.execute('ticket-1', {
      actorUserId: 'tech-1',
    });

    expect(result.props.acknowledgedAt).toEqual(expect.any(Date));
    expect(result.props.status).toBe(TicketStatus.IN_PROGRESS);
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-1', {
      acknowledgedAt: expect.any(Date),
      status: TicketStatus.IN_PROGRESS,
      activities: [
        expect.objectContaining({
          type: TicketActivityType.ACKNOWLEDGED,
          actorUserId: 'tech-1',
          fromUserId: 'tech-1',
          toUserId: 'tech-1',
        }),
        expect.objectContaining({
          type: TicketActivityType.STATUS_CHANGED,
          actorUserId: 'tech-1',
          message: 'ASSIGNED -> IN_PROGRESS',
        }),
      ],
    });
  });

  it('rejects acknowledgment before assignment', async () => {
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

    const useCase = new AcknowledgeTicketUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', {
        actorUserId: 'tech-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
  });

  it('rejects acknowledgment from a non-assignee', async () => {
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
      delete: jest.fn(),
    };

    const useCase = new AcknowledgeTicketUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', {
        actorUserId: 'tech-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenUseCaseError);
  });
});
