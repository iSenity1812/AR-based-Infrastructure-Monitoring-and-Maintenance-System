import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { TicketEntity } from '@domain/entities/ticket.entity';
import {
  AcknowledgeTicketUseCase,
  AddTicketCommentUseCase,
  AssignTicketUseCase,
  AttachTicketEvidenceUseCase,
  CreateTicketEvidenceUploadUrlUseCase,
  CreateTicketUseCase,
  DeleteTicketUseCase,
  GetTicketUseCase,
  ListTicketEvidenceUseCase,
  ListTicketsUseCase,
  TransitionTicketStatusUseCase,
} from '@use-cases/commands/ticket.commands';
import { TicketsController } from './tickets.controller';

function buildTicketEntity(
  overrides: Partial<TicketEntity['props']> = {},
): TicketEntity {
  return new TicketEntity({
    id: 'ticket-1',
    ticketCode: 'TICKET-001',
    title: 'Replace failed node',
    priority: TicketPriority.HIGH,
    status: TicketStatus.ASSIGNED,
    assigneeUserId: 'technician-1',
    activities: [],
    evidence: [],
    assetRef: null,
    metadata: {},
    createdAt: new Date('2026-07-30T10:00:00.000Z'),
    updatedAt: new Date('2026-07-30T10:10:00.000Z'),
    ...overrides,
  });
}

describe('TicketsController', () => {
  let listTicketsUseCase: jest.Mocked<ListTicketsUseCase>;
  let controller: TicketsController;

  beforeEach(() => {
    const createTicketUseCase = {} as jest.Mocked<CreateTicketUseCase>;
    listTicketsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListTicketsUseCase>;
    const getTicketUseCase = {} as jest.Mocked<GetTicketUseCase>;
    const deleteTicketUseCase = {} as jest.Mocked<DeleteTicketUseCase>;
    const transitionTicketStatusUseCase =
      {} as jest.Mocked<TransitionTicketStatusUseCase>;
    const assignTicketUseCase = {} as jest.Mocked<AssignTicketUseCase>;
    const acknowledgeTicketUseCase =
      {} as jest.Mocked<AcknowledgeTicketUseCase>;
    const addTicketCommentUseCase = {} as jest.Mocked<AddTicketCommentUseCase>;
    const attachTicketEvidenceUseCase =
      {} as jest.Mocked<AttachTicketEvidenceUseCase>;
    const createTicketEvidenceUploadUrlUseCase =
      {} as jest.Mocked<CreateTicketEvidenceUploadUrlUseCase>;
    const listTicketEvidenceUseCase =
      {} as jest.Mocked<ListTicketEvidenceUseCase>;
    const ticketEventsService = {} as never;

    controller = new TicketsController(
      createTicketUseCase,
      listTicketsUseCase,
      getTicketUseCase,
      deleteTicketUseCase,
      transitionTicketStatusUseCase,
      assignTicketUseCase,
      acknowledgeTicketUseCase,
      addTicketCommentUseCase,
      attachTicketEvidenceUseCase,
      createTicketEvidenceUploadUrlUseCase,
      listTicketEvidenceUseCase,
      ticketEventsService,
    );
  });

  it('lists only tickets assigned to the current authenticated user', async () => {
    listTicketsUseCase.execute.mockResolvedValue([buildTicketEntity()]);

    const response = await controller.listAssignedToMe(
      {
        ticketCode: 'TICKET',
        status: TicketStatus.ASSIGNED,
      },
      {
        userId: 'technician-1',
        username: 'tech01',
        sessionId: 'session-1',
        roles: [],
        permissions: [],
      },
    );

    expect(listTicketsUseCase.execute.mock.calls[0]?.[0]).toEqual({
      ticketCode: 'TICKET',
      incidentId: undefined,
      status: TicketStatus.ASSIGNED,
      assigneeUserId: 'technician-1',
    });
    expect(response).toHaveLength(1);
    expect(response[0]?.props.assigneeUserId).toBe('technician-1');
  });
});
