import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { TicketActivityType } from '@domain/constants/ticket-activity-type.enum';
import { TicketEvidenceType } from '@domain/constants/ticket-evidence-type.enum';

export interface TicketEvidence {
  id: string;
  type: TicketEvidenceType;
  attachedByUserId: string;
  storageKey?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface TicketActivityEntry {
  id: string;
  type: TicketActivityType;
  actorUserId?: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  message?: string;
  createdAt: Date;
}

export interface TicketEntityProps {
  id: string;
  ticketCode: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  status: TicketStatus;
  incidentId?: string | null;
  ownerUserId?: string | null;
  assigneeUserId?: string | null;
  assignedAt?: Date | null;
  acknowledgedAt?: Date | null;
  activities?: TicketActivityEntry[];
  evidence?: TicketEvidence[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class TicketEntity {
  constructor(public readonly props: TicketEntityProps) {}
}
