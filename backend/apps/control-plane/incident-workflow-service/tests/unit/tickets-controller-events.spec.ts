import { of } from 'rxjs';

import { PERMISSION_CODES } from '../../src/domain/constants/permission-code.constant';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
import type { CurrentAuthContextDto } from '../../src/use-cases/dto/current-auth-context.dto';
import { TicketsController } from '../../src/presentation/http/controllers/tickets.controller';
import { SKIP_API_ENVELOPE_KEY } from '../../src/presentation/http/decorators/skip-api-envelope.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/presentation/http/decorators/require-permissions.decorator';
import type { TicketEventsService } from '../../src/presentation/http/events/ticket-events.service';

function ticket(overrides: Partial<TicketEntity['props']> = {}): TicketEntity {
  return new TicketEntity({
    id: 'ticket-1',
    ticketCode: 'TCK-001',
    title: 'Inspect rack cooling',
    priority: TicketPriority.CRITICAL,
    status: TicketStatus.ASSIGNED,
    incidentId: 'incident-1',
    ownerUserId: 'operator-1',
    assigneeUserId: 'technician-1',
    createdAt: new Date('2026-07-29T10:00:00.000Z'),
    updatedAt: new Date('2026-07-29T10:00:00.000Z'),
    ...overrides,
  });
}

function authContext(
  permissions: CurrentAuthContextDto['permissions'] = [
    PERMISSION_CODES.TICKETS_READ,
  ],
): CurrentAuthContextDto {
  return {
    userId: 'operator-1',
    username: 'operator',
    sessionId: 'session-1',
    roles: [],
    permissions,
  };
}

function controllerWith(input: {
  createTicketUseCase?: { execute: jest.Mock };
  transitionTicketStatusUseCase?: { execute: jest.Mock };
  attachTicketEvidenceUseCase?: { execute: jest.Mock };
  getTicketUseCase?: { execute: jest.Mock };
  ticketEventsService?: {
    streamFor?: jest.Mock;
    publishTicketEvent: jest.Mock;
  };
}): TicketsController {
  const ticketEventsService = input.ticketEventsService ?? {
    streamFor: jest.fn(),
    publishTicketEvent: jest.fn(),
  };

  return new TicketsController(
    (input.createTicketUseCase ?? { execute: jest.fn() }) as never,
    {} as never,
    (input.getTicketUseCase ?? { execute: jest.fn() }) as never,
    {} as never,
    (input.transitionTicketStatusUseCase ?? { execute: jest.fn() }) as never,
    {} as never,
    {} as never,
    {} as never,
    (input.attachTicketEvidenceUseCase ?? { execute: jest.fn() }) as never,
    {} as never,
    {} as never,
    ticketEventsService as unknown as TicketEventsService,
  );
}

describe('TicketsController events', () => {
  it('subscribes the authenticated user to the ticket event stream', () => {
    const stream = of({
      id: 'event-1',
      type: 'ticket.assigned',
      data: { id: 'event-1' },
    });
    const ticketEventsService = {
      streamFor: jest.fn().mockReturnValue(stream),
      publishTicketEvent: jest.fn(),
    } as unknown as TicketEventsService;
    const controller = new TicketsController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      ticketEventsService,
    );
    const authContext = {
      userId: 'operator-1',
      username: 'operator',
      sessionId: 'session-1',
      roles: [],
      permissions: [PERMISSION_CODES.TICKETS_READ],
    } satisfies CurrentAuthContextDto;

    expect(controller.events(authContext)).toBe(stream);
    expect(ticketEventsService.streamFor).toHaveBeenCalledWith(authContext);
  });

  it('requires ticket read permission and skips normal API envelope wrapping', () => {
    const eventsHandler = TicketsController.prototype.events;

    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, eventsHandler),
    ).toEqual([PERMISSION_CODES.TICKETS_READ]);
    expect(Reflect.getMetadata(SKIP_API_ENVELOPE_KEY, eventsHandler)).toBe(
      true,
    );
  });

  it('publishes a ticket created event after create succeeds', async () => {
    const createdTicket = ticket({ status: TicketStatus.OPEN });
    const createTicketUseCase = {
      execute: jest.fn().mockResolvedValue(createdTicket),
    };
    const ticketEventsService = {
      streamFor: jest.fn(),
      publishTicketEvent: jest.fn(),
    };
    const controller = controllerWith({
      createTicketUseCase,
      ticketEventsService,
    });

    await expect(
      controller.create({
        ticketCode: 'TCK-001',
        title: 'Inspect rack cooling',
        priority: TicketPriority.CRITICAL,
      }),
    ).resolves.toBe(createdTicket);
    expect(ticketEventsService.publishTicketEvent).toHaveBeenCalledWith({
      type: 'ticket.created',
      ticket: createdTicket,
      actorUserId: 'operator-1',
    });
  });

  it('does not publish when create fails', async () => {
    const createTicketUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('duplicate ticket')),
    };
    const ticketEventsService = {
      streamFor: jest.fn(),
      publishTicketEvent: jest.fn(),
    };
    const controller = controllerWith({
      createTicketUseCase,
      ticketEventsService,
    });

    await expect(
      controller.create({
        ticketCode: 'TCK-001',
        title: 'Inspect rack cooling',
        priority: TicketPriority.CRITICAL,
      }),
    ).rejects.toThrow('duplicate ticket');
    expect(ticketEventsService.publishTicketEvent).not.toHaveBeenCalled();
  });

  it('publishes a status changed event after status update succeeds', async () => {
    const updatedTicket = ticket({ status: TicketStatus.IN_PROGRESS });
    const transitionTicketStatusUseCase = {
      execute: jest.fn().mockResolvedValue(updatedTicket),
    };
    const ticketEventsService = {
      streamFor: jest.fn(),
      publishTicketEvent: jest.fn(),
    };
    const controller = controllerWith({
      transitionTicketStatusUseCase,
      ticketEventsService,
    });

    await expect(
      controller.updateStatus('ticket-1', {
        status: TicketStatus.IN_PROGRESS,
      }),
    ).resolves.toBe(updatedTicket);
    expect(ticketEventsService.publishTicketEvent).toHaveBeenCalledWith({
      type: 'ticket.status_changed',
      ticket: updatedTicket,
      actorUserId: undefined,
    });
  });

  it('publishes evidence attached after evidence metadata attach succeeds', async () => {
    const existingTicket = ticket();
    const evidence = {
      id: 'evidence-1',
      type: 'NOTE',
      attachedByUserId: 'operator-1',
      note: 'Checked on site',
      createdAt: new Date('2026-07-29T10:00:00.000Z'),
    };
    const getTicketUseCase = {
      execute: jest.fn().mockResolvedValue(existingTicket),
    };
    const attachTicketEvidenceUseCase = {
      execute: jest.fn().mockResolvedValue(evidence),
    };
    const ticketEventsService = {
      streamFor: jest.fn(),
      publishTicketEvent: jest.fn(),
    };
    const controller = controllerWith({
      getTicketUseCase,
      attachTicketEvidenceUseCase,
      ticketEventsService,
    });

    await expect(
      controller.attachEvidence(
        'ticket-1',
        {
          type: 'NOTE',
          note: 'Checked on site',
        } as never,
        authContext(),
      ),
    ).resolves.toBe(evidence);
    expect(ticketEventsService.publishTicketEvent).toHaveBeenCalledWith({
      type: 'ticket.evidence_attached',
      ticket: existingTicket,
      actorUserId: 'operator-1',
    });
  });
});
