import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { TransitionTicketStatusUseCase } from '../../src/use-cases/commands/ticket.commands';
import { BadRequestUseCaseError } from '../../src/use-cases/errors/use-case.errors';

describe('TransitionTicketStatusUseCase', () => {
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
    };

    const useCase = new TransitionTicketStatusUseCase(ticketRepository);
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
    };

    const useCase = new TransitionTicketStatusUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', TicketStatus.CLOSED),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(ticketRepository.update).not.toHaveBeenCalled();
  });
});
