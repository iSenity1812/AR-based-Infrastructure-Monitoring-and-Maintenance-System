import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import { AddTicketCommentUseCase } from '../../src/use-cases/commands/ticket.commands';
import { BadRequestUseCaseError } from '../../src/use-cases/errors/use-case.errors';

describe('AddTicketCommentUseCase', () => {
  it('adds a comment activity to the ticket timeline', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      createdAt: new Date('2026-06-20T00:00:00.000Z'),
      updatedAt: new Date('2026-06-20T00:00:00.000Z'),
    });

    const updatedTicket = new TicketEntity({
      ...ticket.props,
      updatedAt: new Date('2026-06-20T00:20:00.000Z'),
    });

    const ticketRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(ticket),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue(updatedTicket),
    };

    const useCase = new AddTicketCommentUseCase(ticketRepository);
    const result = await useCase.execute('ticket-1', {
      actorUserId: 'tech-1',
      comment: 'Checked the rack and tightened the cable.',
    });

    expect(result).toBe(updatedTicket);
    expect(ticketRepository.update).toHaveBeenCalledWith('ticket-1', {
      activities: [
        expect.objectContaining({
          type: TicketActivityType.COMMENT_ADDED,
          actorUserId: 'tech-1',
          message: 'Checked the rack and tightened the cable.',
        }),
      ],
    });
  });

  it('rejects empty comments', async () => {
    const ticket = new TicketEntity({
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Investigate DB latency',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
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

    const useCase = new AddTicketCommentUseCase(ticketRepository);

    await expect(
      useCase.execute('ticket-1', {
        actorUserId: 'tech-1',
        comment: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(ticketRepository.update).not.toHaveBeenCalled();
  });
});
