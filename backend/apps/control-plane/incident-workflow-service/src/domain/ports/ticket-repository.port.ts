import { TicketActivityType } from '@domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import {
  TicketEntity,
  type TicketEvidence,
} from '@domain/entities/ticket.entity';

export interface CreateTicketRecord {
  ticketCode: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  incidentId?: string;
  ownerUserId?: string;
  assigneeUserId?: string;
  assignedAt?: Date | null;
  acknowledgedAt?: Date | null;
  activities?: Array<{
    id: string;
    type: TicketActivityType;
    actorUserId?: string;
    fromUserId?: string | null;
    toUserId?: string | null;
    message?: string;
    createdAt: Date;
  }>;
  evidence?: TicketEvidence[];
  metadata?: Record<string, unknown>;
}

export interface TicketListQuery {
  ticketCode?: string;
  incidentId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface TicketUpdateRecord {
  ticketCode?: string;
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  incidentId?: string | null;
  ownerUserId?: string | null;
  assigneeUserId?: string | null;
  assignedAt?: Date | null;
  acknowledgedAt?: Date | null;
  activities?: Array<{
    id: string;
    type: TicketActivityType;
    actorUserId?: string;
    fromUserId?: string | null;
    toUserId?: string | null;
    message?: string;
    createdAt: Date;
  }>;
  evidence?: TicketEvidence[];
  metadata?: Record<string, unknown>;
}

export interface TicketRepositoryPort {
  create(input: CreateTicketRecord): Promise<TicketEntity>;
  findById(ticketId: string): Promise<TicketEntity | null>;
  findByCode(ticketCode: string): Promise<TicketEntity | null>;
  findMany(query?: TicketListQuery): Promise<TicketEntity[]>;
  update(
    ticketId: string,
    input: TicketUpdateRecord,
  ): Promise<TicketEntity | null>;
  delete(ticketId: string): Promise<TicketEntity | null>;
}
