import { apiConfig } from './config';
import { requestJson } from './client';
import type {
  CreateTicketInput,
  EvidenceType,
  Ticket,
  TicketEvidence,
  TicketProps,
  UploadTarget,
} from '../types/ticket';

function unwrapTicket(ticket: Ticket | TicketProps): TicketProps {
  return 'props' in ticket && ticket.props ? ticket.props : (ticket as TicketProps);
}

export async function listTickets(token: string): Promise<TicketProps[]> {
  const tickets = await requestJson<Ticket[] | TicketProps[]>(
    apiConfig.incidentApiUrl,
    '/tickets',
    { token },
  );

  return tickets.map(unwrapTicket);
}

export async function getTicket(
  ticketId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}`,
      { token },
    ),
  );
}

export async function createTicket(
  input: CreateTicketInput,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(apiConfig.incidentApiUrl, '/tickets', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteTicket(
  ticketId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}`,
      { method: 'DELETE', token },
    ),
  );
}

export async function assignTicket(
  ticketId: string,
  assigneeUserId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}/assignment`,
      {
        method: 'PATCH',
        token,
        body: JSON.stringify({ assigneeUserId }),
      },
    ),
  );
}

export async function acknowledgeTicket(
  ticketId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}/acknowledge`,
      { method: 'POST', token },
    ),
  );
}

export async function resolveTicket(
  ticketId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}/resolve`,
      { method: 'POST', token },
    ),
  );
}

export async function closeTicket(
  ticketId: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}/close`,
      { method: 'POST', token },
    ),
  );
}

export async function addTicketComment(
  ticketId: string,
  comment: string,
  token: string,
): Promise<TicketProps> {
  return unwrapTicket(
    await requestJson<Ticket | TicketProps>(
      apiConfig.incidentApiUrl,
      `/tickets/${ticketId}/comments`,
      {
        method: 'POST',
        token,
        body: JSON.stringify({ comment }),
      },
    ),
  );
}

export async function createEvidenceUploadUrl(
  ticketId: string,
  fileName: string,
  mimeType: string,
  token: string,
  type: EvidenceType = 'IMAGE',
): Promise<UploadTarget> {
  return requestJson<UploadTarget>(
    apiConfig.incidentApiUrl,
    `/tickets/${ticketId}/evidence/upload-url`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ type, fileName, mimeType }),
    },
  );
}

export async function attachTicketEvidence(
  ticketId: string,
  input: {
    type: EvidenceType;
    storageKey?: string;
    url?: string;
    fileName?: string;
    mimeType?: string;
    note?: string;
  },
  token: string,
): Promise<TicketEvidence> {
  return requestJson<TicketEvidence>(
    apiConfig.incidentApiUrl,
    `/tickets/${ticketId}/evidence`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );
}
