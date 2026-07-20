import { TicketStatus } from '@domain/constants/ticket-status.enum';

const TICKET_STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> =
  {
    [TicketStatus.OPEN]: [TicketStatus.ASSIGNED, TicketStatus.CANCELLED],
    [TicketStatus.ASSIGNED]: [
      TicketStatus.IN_PROGRESS,
      TicketStatus.WAITING_FOR_INFO,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.IN_PROGRESS]: [
      TicketStatus.WAITING_FOR_INFO,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.WAITING_FOR_INFO]: [
      TicketStatus.ASSIGNED,
      TicketStatus.IN_PROGRESS,
      TicketStatus.RESOLVED,
      TicketStatus.CANCELLED,
    ],
    [TicketStatus.RESOLVED]: [TicketStatus.CLOSED],
    [TicketStatus.CLOSED]: [],
    [TicketStatus.CANCELLED]: [],
  };

export function canTransitionTicketStatus(
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return TICKET_STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedTicketTransitions(
  from: TicketStatus,
): readonly TicketStatus[] {
  return TICKET_STATUS_TRANSITIONS[from];
}
