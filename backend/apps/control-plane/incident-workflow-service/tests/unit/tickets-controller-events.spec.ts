import { of } from 'rxjs';

import { PERMISSION_CODES } from '../../src/domain/constants/permission-code.constant';
import type { CurrentAuthContextDto } from '../../src/use-cases/dto/current-auth-context.dto';
import { TicketsController } from '../../src/presentation/http/controllers/tickets.controller';
import { SKIP_API_ENVELOPE_KEY } from '../../src/presentation/http/decorators/skip-api-envelope.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/presentation/http/decorators/require-permissions.decorator';
import type { TicketEventsService } from '../../src/presentation/http/events/ticket-events.service';

describe('TicketsController events', () => {
  it('subscribes the authenticated user to the ticket event stream', () => {
    const stream = of({
      id: 'event-1',
      type: 'ticket.assigned',
      data: { id: 'event-1' },
    });
    const ticketEventsService = {
      streamFor: jest.fn().mockReturnValue(stream),
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
});
