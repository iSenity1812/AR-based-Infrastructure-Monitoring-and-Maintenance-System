import { firstValueFrom, take, timeout } from 'rxjs';

import { PERMISSION_CODES } from '../../src/domain/constants/permission-code.constant';
import { TicketActivityType } from '../../src/domain/constants/ticket-activity-type.enum';
import { TicketEvidenceType } from '../../src/domain/constants/ticket-evidence-type.enum';
import { TicketPriority } from '../../src/domain/constants/ticket-priority.enum';
import { TicketStatus } from '../../src/domain/constants/ticket-status.enum';
import { TicketEntity } from '../../src/domain/entities/ticket.entity';
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
  it('publishes compact ticket events without activity or evidence history', async () => {
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

    service.publishTicketEvent({
      type: 'ticket.created',
      ticket: new TicketEntity({
        id: 'ticket-2',
        ticketCode: 'TCK-002',
        title: 'Replace failed fan',
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        incidentId: null,
        ownerUserId: 'operator-1',
        assigneeUserId: null,
        activities: [
          {
            id: 'activity-1',
            type: TicketActivityType.CREATED,
            actorUserId: 'operator-1',
            createdAt: new Date('2026-07-29T10:00:00.000Z'),
          },
        ],
        evidence: [
          {
            id: 'evidence-1',
            type: TicketEvidenceType.NOTE,
            attachedByUserId: 'operator-1',
            note: 'Internal detail',
            createdAt: new Date('2026-07-29T10:00:00.000Z'),
          },
        ],
        createdAt: new Date('2026-07-29T10:00:00.000Z'),
        updatedAt: new Date('2026-07-29T10:00:00.000Z'),
      }),
      actorUserId: 'operator-1',
    });

    const message = await nextEvent;

    expect(message).toMatchObject({
      id: expect.any(String),
      type: 'ticket.created',
      data: {
        id: expect.any(String),
        type: 'ticket.created',
        occurredAt: expect.any(String),
        ticket: {
          id: 'ticket-2',
          ticketCode: 'TCK-002',
          title: 'Replace failed fan',
          priority: TicketPriority.HIGH,
          status: TicketStatus.OPEN,
          incidentId: null,
          assigneeUserId: null,
        },
        actorUserId: 'operator-1',
      },
    });
    expect(message.data).not.toHaveProperty('ticket.activities');
    expect(message.data).not.toHaveProperty('ticket.evidence');
  });

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
