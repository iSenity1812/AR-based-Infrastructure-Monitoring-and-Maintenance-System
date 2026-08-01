import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import type { IncidentEntity } from '@domain/entities/incident.entity';
import type { TicketEntity } from '@domain/entities/ticket.entity';

export function deriveEffectiveIncidentStatus(
  incident: IncidentEntity,
  tickets: TicketEntity[],
): IncidentStatus {
  if (
    tickets.length === 0 ||
    [IncidentStatus.CLOSED, IncidentStatus.CANCELLED].includes(
      incident.props.status,
    )
  ) {
    return incident.props.status;
  }

  if (tickets.every((ticket) => ticket.props.status === TicketStatus.CLOSED)) {
    return IncidentStatus.CLOSED;
  }

  if (
    tickets.every((ticket) =>
      [TicketStatus.RESOLVED, TicketStatus.CLOSED].includes(
        ticket.props.status,
      ),
    )
  ) {
    return IncidentStatus.RESOLVED;
  }

  return incident.props.status;
}
