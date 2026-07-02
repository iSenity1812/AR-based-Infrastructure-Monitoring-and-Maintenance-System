import { TicketStatus } from '@domain/constants/ticket-status.enum';
import {
  canTransitionTicketStatus,
  getAllowedTicketTransitions,
} from '@domain/policies/ticket-lifecycle.policy';

describe('ticket lifecycle policy', () => {
  it('allows the expected MVP transitions', () => {
    expect(
      canTransitionTicketStatus(TicketStatus.OPEN, TicketStatus.ASSIGNED),
    ).toBe(true);
    expect(
      canTransitionTicketStatus(
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
      ),
    ).toBe(true);
    expect(
      canTransitionTicketStatus(
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
      ),
    ).toBe(true);
    expect(
      canTransitionTicketStatus(TicketStatus.RESOLVED, TicketStatus.CLOSED),
    ).toBe(true);
  });

  it('blocks invalid backward transitions', () => {
    expect(
      canTransitionTicketStatus(TicketStatus.OPEN, TicketStatus.CLOSED),
    ).toBe(false);
    expect(
      canTransitionTicketStatus(TicketStatus.CLOSED, TicketStatus.OPEN),
    ).toBe(false);
    expect(
      canTransitionTicketStatus(TicketStatus.CANCELLED, TicketStatus.OPEN),
    ).toBe(false);
  });

  it('lists allowed transitions for a ticket status', () => {
    expect(getAllowedTicketTransitions(TicketStatus.OPEN)).toEqual([
      TicketStatus.ASSIGNED,
      TicketStatus.CANCELLED,
    ]);
  });
});
