import type { TicketActivity, TicketProps } from '../types/ticket';

export type TicketNotificationTone = 'cyan' | 'purple' | 'amber' | 'green' | 'red';

export interface TicketNotification {
  id: string;
  ticketId: string;
  ticketCode: string;
  title: string;
  body: string;
  createdAt: string;
  tone: TicketNotificationTone;
}

export function buildTechnicianNotifications(
  tickets: TicketProps[],
  technicianId: string,
): TicketNotification[] {
  return tickets
    .filter((ticket) => ticket.assigneeUserId === technicianId)
    .flatMap((ticket) =>
      (ticket.activities ?? [])
        .filter((activity) => activity.actorUserId !== technicianId)
        .map((activity) => toNotification(ticket, activity)),
    )
    .filter((item): item is TicketNotification => Boolean(item))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 40);
}

function toNotification(ticket: TicketProps, activity: TicketActivity): TicketNotification | null {
  const common = { id: `${ticket.id}:${activity.id}`, ticketId: ticket.id, ticketCode: ticket.ticketCode, createdAt: activity.createdAt };

  switch (activity.type) {
    case 'CREATED':
      return { ...common, title: ticket.incidentId ? 'New incident ticket' : 'New ticket', body: ticket.title, tone: ticket.priority === 'CRITICAL' ? 'red' : 'cyan' };
    case 'ASSIGNED':
      return { ...common, title: 'Ticket assigned to you', body: activity.message ?? ticket.title, tone: 'purple' };
    case 'REASSIGNED':
      return { ...common, title: 'Assignment updated', body: activity.message ?? ticket.title, tone: 'purple' };
    case 'COMMENT_ADDED':
      return { ...common, title: 'New operator note', body: activity.message ?? ticket.title, tone: 'amber' };
    case 'EVIDENCE_ATTACHED':
      return { ...common, title: 'New evidence attached', body: activity.message ?? ticket.title, tone: 'amber' };
    case 'STATUS_CHANGED':
      return { ...common, title: activity.message?.includes('CLOSED') ? 'Ticket closed' : 'Ticket status updated', body: activity.message ?? ticket.title, tone: activity.message?.includes('CLOSED') ? 'green' : 'cyan' };
    default:
      return null;
  }
}
