import { randomUUID } from 'node:crypto';

import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, map, Observable, Subject } from 'rxjs';

import {
  PERMISSION_CODES,
  type PermissionCode,
} from '@domain/constants/permission-code.constant';
import type { TicketEntity } from '@domain/entities/ticket.entity';
import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import type { CurrentAuthContextDto } from '@use-cases/dto/current-auth-context.dto';

export type TicketRealtimeEventType =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.status_changed'
  | 'ticket.deleted'
  | 'ticket.comment_added'
  | 'ticket.evidence_attached';

export interface TicketRealtimeEvent {
  id: string;
  type: TicketRealtimeEventType;
  occurredAt: string;
  ticket: {
    id: string;
    ticketCode: string;
    title: string;
    priority: TicketPriority;
    status: TicketStatus;
    incidentId?: string | null;
    assigneeUserId?: string | null;
  };
  actorUserId?: string;
}

const OPERATOR_EVENT_PERMISSIONS = new Set<PermissionCode>([
  PERMISSION_CODES.TICKETS_CREATE,
  PERMISSION_CODES.TICKETS_ASSIGN,
  PERMISSION_CODES.TICKETS_STATUS_UPDATE,
  PERMISSION_CODES.TICKETS_CLOSE,
  PERMISSION_CODES.TICKETS_CANCEL,
]);

@Injectable()
export class TicketEventsService {
  private readonly events = new Subject<TicketRealtimeEvent>();

  publish(event: TicketRealtimeEvent): void {
    this.events.next(event);
  }

  publishTicketEvent(input: {
    type: TicketRealtimeEventType;
    ticket: TicketEntity;
    actorUserId?: string;
  }): void {
    this.publish({
      id: randomUUID(),
      type: input.type,
      occurredAt: new Date().toISOString(),
      ticket: {
        id: input.ticket.props.id,
        ticketCode: input.ticket.props.ticketCode,
        title: input.ticket.props.title,
        priority: input.ticket.props.priority,
        status: input.ticket.props.status,
        incidentId: input.ticket.props.incidentId,
        assigneeUserId: input.ticket.props.assigneeUserId,
      },
      actorUserId: input.actorUserId,
    });
  }

  streamFor(authContext: CurrentAuthContextDto): Observable<MessageEvent> {
    return this.events.asObservable().pipe(
      filter((event) => this.canReceiveEvent(authContext, event)),
      map((event) => ({
        id: event.id,
        type: event.type,
        data: event,
      })),
    );
  }

  private canReceiveEvent(
    authContext: CurrentAuthContextDto,
    event: TicketRealtimeEvent,
  ): boolean {
    if (this.hasOperatorEventPermission(authContext.permissions)) {
      return true;
    }

    return event.ticket.assigneeUserId === authContext.userId;
  }

  private hasOperatorEventPermission(permissions: PermissionCode[]): boolean {
    return permissions.some((permission) =>
      OPERATOR_EVENT_PERMISSIONS.has(permission),
    );
  }
}
