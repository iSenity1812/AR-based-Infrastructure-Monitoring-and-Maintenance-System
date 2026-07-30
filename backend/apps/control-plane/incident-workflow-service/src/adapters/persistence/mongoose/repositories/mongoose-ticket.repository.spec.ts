import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { MongooseTicketRepository } from './mongoose-ticket.repository';

function createDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    _id: {
      toString: () => 'ticket-1',
    },
    ticketCode: 'TICKET-001',
    title: 'Replace failed node',
    priority: TicketPriority.HIGH,
    status: TicketStatus.ASSIGNED,
    assigneeUserId: 'technician-1',
    activities: [],
    evidence: [],
    metadata: {},
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:10:00.000Z'),
    ...overrides,
  };
}

describe('MongooseTicketRepository', () => {
  it('filters ticket lists by assignee user id', async () => {
    const documents = [createDocument()];
    const sort = jest.fn().mockResolvedValue(documents);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseTicketRepository({
      find,
    } as never);

    const tickets = await repository.findMany({
      assigneeUserId: 'technician-1',
      status: TicketStatus.ASSIGNED,
    });

    expect(find).toHaveBeenCalledWith({
      assigneeUserId: 'technician-1',
      status: TicketStatus.ASSIGNED,
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.props.assigneeUserId).toBe('technician-1');
  });
});
