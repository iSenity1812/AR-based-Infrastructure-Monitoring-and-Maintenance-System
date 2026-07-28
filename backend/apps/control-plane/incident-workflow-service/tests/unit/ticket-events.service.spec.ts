import { firstValueFrom, take, timeout } from 'rxjs';

import { PERMISSION_CODES } from '../../src/domain/constants/permission-code.constant';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import type { CurrentAuthContextDto } from '../../src/use-cases/dto/current-auth-context.dto';
import {
  TicketEventsService,
  type TicketRealtimeEvent,
} from '../../src/presentation/http/events/ticket-events.service';

function authContext(input: {
  userId: string;
  permissions: CurrentAuthContextDto['permissions'];
}): CurrentAuthContextDto {
  return {
    userId: input.userId,
    username: input.userId,
    sessionId: `${input.userId}-session`,
    roles: [],
    permissions: input.permissions,
  };
}

function ticketEvent(input: {
  id: string;
  assigneeUserId?: string | null;
}): TicketRealtimeEvent {
  return {
    id: input.id,
    type: 'ticket.assigned',
    occurredAt: '2026-07-29T10:00:00.000Z',
    ticket: {
      id: 'ticket-1',
      ticketCode: 'TCK-001',
      title: 'Inspect rack cooling',
      priority: TicketPriority.CRITICAL,
      status: TicketStatus.ASSIGNED,
      incidentId: 'incident-1',
      assigneeUserId: input.assigneeUserId,
    },
    actorUserId: 'operator-1',
  };
}

describe('TicketEventsService', () => {
  it('streams all ticket events to operator-style permission holders', async () => {
    const service = new TicketEventsService();
    const nextEvent = firstValueFrom(
      service
        .streamFor(
          authContext({
            userId: 'operator-1',
            permissions: [
              PERMISSION_CODES.TICKETS_READ,
              PERMISSION_CODES.TICKETS_ASSIGN,
            ],
          }),
        )
        .pipe(take(1), timeout(100)),
    );

    service.publish(ticketEvent({ id: 'event-1', assigneeUserId: null }));

    await expect(nextEvent).resolves.toEqual({
      id: 'event-1',
      type: 'ticket.assigned',
      data: ticketEvent({ id: 'event-1', assigneeUserId: null }),
    });
  });

  it('streams assigned ticket events to the matching technician', async () => {
    const service = new TicketEventsService();
    const nextEvent = firstValueFrom(
      service
        .streamFor(
          authContext({
            userId: 'technician-1',
            permissions: [PERMISSION_CODES.TICKETS_READ],
          }),
        )
        .pipe(take(1), timeout(100)),
    );

    service.publish(
      ticketEvent({ id: 'event-2', assigneeUserId: 'technician-1' }),
    );

    await expect(nextEvent).resolves.toMatchObject({
      id: 'event-2',
      type: 'ticket.assigned',
    });
  });

  it('does not stream other users assigned tickets to a technician', async () => {
    const service = new TicketEventsService();
    const nextEvent = firstValueFrom(
      service
        .streamFor(
          authContext({
            userId: 'technician-1',
            permissions: [PERMISSION_CODES.TICKETS_READ],
          }),
        )
        .pipe(take(1), timeout(20)),
    );

    service.publish(
      ticketEvent({ id: 'event-3', assigneeUserId: 'technician-2' }),
    );

    await expect(nextEvent).rejects.toThrow();
  });
});
