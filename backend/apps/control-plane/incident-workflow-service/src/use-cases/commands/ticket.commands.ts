import { randomUUID } from 'node:crypto';

import { TicketActivityType } from '@domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { TicketEvidenceType } from '@domain/constants/ticket-evidence-type.enum';
import {
  TicketEntity,
  type TicketActivityEntry,
  type TicketEvidence,
  type TicketAssetReference,
} from '@domain/entities/ticket.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import { deriveEffectiveIncidentStatus } from '@domain/policies/incident-ticket-status.policy';
import type {
  ObjectStoragePort,
  PresignedUploadTarget,
} from '@domain/ports/object-storage.port';
import type {
  TicketListQuery,
  TicketRepositoryPort,
} from '@domain/ports/ticket-repository.port';
import {
  BadRequestUseCaseError,
  ConflictUseCaseError,
  ForbiddenUseCaseError,
  NotFoundUseCaseError,
  ServiceUnavailableUseCaseError,
} from '@use-cases/errors/use-case.errors';
import {
  canTransitionTicketStatus,
  getAllowedTicketTransitions,
} from '@domain/policies/ticket-lifecycle.policy';

export interface CreateTicketCommand {
  ticketCode: string;
  title: string;
  description?: string;
  priority: TicketPriority;
  incidentId?: string;
  ownerUserId?: string;
  assigneeUserId?: string;
  assetRef?: TicketAssetReference;
  metadata?: Record<string, unknown>;
}

export interface AssignTicketCommand {
  actorUserId: string;
  assigneeUserId: string;
  message?: string;
}

export interface AcknowledgeTicketCommand {
  actorUserId: string;
  message?: string;
}

export interface TransitionTicketStatusCommand {
  actorUserId: string;
}

export interface AddTicketCommentCommand {
  actorUserId: string;
  actorDisplayName?: string;
  actorRole?: string;
  comment: string;
}

export interface AttachTicketEvidenceCommand {
  actorUserId: string;
  type: TicketEvidenceType;
  storageKey?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTicketEvidenceUploadUrlCommand {
  actorUserId: string;
  type: TicketEvidenceType;
  fileName: string;
  mimeType: string;
}

export interface TicketEvidenceUploadTarget extends PresignedUploadTarget {
  type: TicketEvidenceType;
  fileName: string;
  mimeType: string;
  storageKey: string;
}

const UPLOADABLE_EVIDENCE_TYPES = new Set<TicketEvidenceType>([
  TicketEvidenceType.IMAGE,
  TicketEvidenceType.DOCUMENT,
  TicketEvidenceType.DIAGNOSTIC_SNAPSHOT,
  TicketEvidenceType.FIELD_EVIDENCE,
]);

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createActivity(input: {
  type: TicketActivityType;
  actorUserId: string;
  actorDisplayName?: string;
  actorRole?: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  message?: string;
}): TicketActivityEntry {
  return {
    id: randomUUID(),
    type: input.type,
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
    actorRole: input.actorRole,
    fromUserId: input.fromUserId ?? null,
    toUserId: input.toUserId ?? null,
    message: input.message,
    createdAt: new Date(),
  };
}

export class CreateTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly incidentRepository: IncidentRepositoryPort,
  ) {}

  async execute(command: CreateTicketCommand): Promise<TicketEntity> {
    const existing = await this.ticketRepository.findByCode(command.ticketCode);
    if (existing) {
      throw new ConflictUseCaseError(
        `Ticket ${command.ticketCode} already exists.`,
      );
    }

    const incident = command.incidentId
      ? await this.incidentRepository.findById(command.incidentId)
      : null;

    if (command.incidentId && !incident) {
      throw new NotFoundUseCaseError(
        `Incident ${command.incidentId} was not found.`,
      );
    }

    const created = await this.ticketRepository.create({
      ticketCode: command.ticketCode,
      title: command.title,
      description: command.description,
      priority: command.priority,
      status: command.assigneeUserId
        ? TicketStatus.ASSIGNED
        : TicketStatus.OPEN,
      incidentId: command.incidentId,
      ownerUserId: command.ownerUserId,
      assigneeUserId: command.assigneeUserId,
      assignedAt: command.assigneeUserId ? new Date() : null,
      assetRef: command.assetRef ?? null,
      activities: [
        createActivity({
          type: TicketActivityType.CREATED,
          actorUserId: command.ownerUserId ?? 'system',
          toUserId: command.assigneeUserId,
        }),
        ...(command.assigneeUserId
          ? [
              createActivity({
                type: TicketActivityType.ASSIGNED,
                actorUserId: command.ownerUserId ?? 'system',
                toUserId: command.assigneeUserId,
              }),
            ]
          : []),
      ],
      metadata: command.metadata ?? {},
    });

    if (incident) {
      await this.incidentRepository.update(incident.props.id, {
        ticketIds: Array.from(
          new Set([...incident.props.ticketIds, created.props.id]),
        ),
      });
    }

    return created;
  }
}

export class ListTicketsUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  execute(query: TicketListQuery = {}): Promise<TicketEntity[]> {
    return this.ticketRepository.findMany(query);
  }
}

export class GetTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(ticketId: string): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return ticket;
  }
}

export class DeleteTicketUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly incidentRepository: IncidentRepositoryPort,
  ) {}

  async execute(ticketId: string): Promise<TicketEntity> {
    const deleted = await this.ticketRepository.delete(ticketId);
    if (!deleted) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    if (deleted.props.incidentId) {
      const incident = await this.incidentRepository.findById(
        deleted.props.incidentId,
      );

      if (incident) {
        await this.incidentRepository.update(incident.props.id, {
          ticketIds: incident.props.ticketIds.filter((id) => id !== ticketId),
        });
      }
    }

    return deleted;
  }
}

export class TransitionTicketStatusUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly incidentRepository: IncidentRepositoryPort,
  ) {}

  async execute(
    ticketId: string,
    nextStatus: TicketStatus,
    command?: TransitionTicketStatusCommand,
  ): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    const isLegacyAcknowledgedResolve =
      nextStatus === TicketStatus.RESOLVED &&
      ticket.props.status === TicketStatus.OPEN &&
      Boolean(ticket.props.assigneeUserId) &&
      Boolean(ticket.props.acknowledgedAt);

    if (
      !isLegacyAcknowledgedResolve &&
      !canTransitionTicketStatus(ticket.props.status, nextStatus)
    ) {
      throw new BadRequestUseCaseError(
        `Ticket status cannot transition from ${ticket.props.status} to ${nextStatus}.`,
        {
          allowedTransitions: getAllowedTicketTransitions(ticket.props.status),
        },
      );
    }

    if (nextStatus === TicketStatus.RESOLVED) {
      if (!ticket.props.assigneeUserId) {
        throw new BadRequestUseCaseError(
          'Ticket must be assigned before it can be resolved.',
        );
      }

      if (!command?.actorUserId) {
        throw new ForbiddenUseCaseError(
          'Only the assigned technician can resolve this ticket.',
        );
      }

      if (ticket.props.assigneeUserId !== command.actorUserId) {
        throw new ForbiddenUseCaseError(
          'Only the assigned technician can resolve this ticket.',
        );
      }

      if (!ticket.props.acknowledgedAt) {
        throw new BadRequestUseCaseError(
          'Ticket must be acknowledged before it can be resolved.',
        );
      }
    }

    const updated = await this.ticketRepository.update(ticketId, {
      status: nextStatus,
      activities: [
        ...(ticket.props.activities ?? []),
        createActivity({
          type: TicketActivityType.STATUS_CHANGED,
          actorUserId:
            command?.actorUserId ??
            ticket.props.assigneeUserId ??
            ticket.props.ownerUserId ??
            'system',
          fromUserId:
            command?.actorUserId ??
            ticket.props.assigneeUserId ??
            ticket.props.ownerUserId ??
            null,
          message: `${ticket.props.status} -> ${nextStatus}`,
        }),
      ],
    });

    if (!updated) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    await this.syncLinkedIncidentStatus(updated);

    return updated;
  }

  private async syncLinkedIncidentStatus(ticket: TicketEntity): Promise<void> {
    const incidentId = ticket.props.incidentId;
    if (!incidentId) {
      return;
    }

    const incident = await this.incidentRepository.findById(incidentId);
    if (!incident) {
      return;
    }

    const linkedTickets = await this.ticketRepository.findMany({ incidentId });
    if (linkedTickets.length === 0) {
      return;
    }

    const nextIncidentStatus = deriveEffectiveIncidentStatus(
      incident,
      linkedTickets,
    );

    if (incident.props.status === nextIncidentStatus) {
      return;
    }

    await this.incidentRepository.update(incidentId, {
      status: nextIncidentStatus,
    });
  }
}

export class AssignTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(
    ticketId: string,
    command: AssignTicketCommand,
  ): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    if (
      ticket.props.status === TicketStatus.CLOSED ||
      ticket.props.status === TicketStatus.CANCELLED
    ) {
      throw new BadRequestUseCaseError(
        'Closed or cancelled tickets cannot be assigned.',
      );
    }

    if (ticket.props.assigneeUserId === command.assigneeUserId) {
      throw new ConflictUseCaseError(
        `Ticket ${ticketId} is already assigned to ${command.assigneeUserId}.`,
      );
    }

    const nextStatus = TicketStatus.ASSIGNED;
    const activityType = ticket.props.assigneeUserId
      ? TicketActivityType.REASSIGNED
      : TicketActivityType.ASSIGNED;

    const updated = await this.ticketRepository.update(ticketId, {
      ownerUserId: command.actorUserId,
      assigneeUserId: command.assigneeUserId,
      assignedAt: new Date(),
      status: nextStatus,
      activities: [
        ...(ticket.props.activities ?? []),
        createActivity({
          type: activityType,
          actorUserId: command.actorUserId,
          fromUserId: ticket.props.assigneeUserId ?? null,
          toUserId: command.assigneeUserId,
          message: command.message,
        }),
      ],
    });

    if (!updated) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return updated;
  }
}

export class AcknowledgeTicketUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(
    ticketId: string,
    command: AcknowledgeTicketCommand,
  ): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    if (!ticket.props.assigneeUserId) {
      throw new BadRequestUseCaseError(
        'Ticket must be assigned before it can be acknowledged.',
      );
    }

    if (ticket.props.assigneeUserId !== command.actorUserId) {
      throw new ForbiddenUseCaseError(
        'Only the assigned technician can acknowledge this ticket.',
      );
    }

    if (ticket.props.acknowledgedAt) {
      return ticket;
    }

    const shouldMoveIntoWork =
      ticket.props.status === TicketStatus.OPEN ||
      ticket.props.status === TicketStatus.ASSIGNED;

    const nextActivities = [
      ...(ticket.props.activities ?? []),
      createActivity({
        type: TicketActivityType.ACKNOWLEDGED,
        actorUserId: command.actorUserId,
        fromUserId: ticket.props.assigneeUserId,
        toUserId: ticket.props.assigneeUserId,
        message: command.message,
      }),
    ];

    if (shouldMoveIntoWork) {
      nextActivities.push(
        createActivity({
          type: TicketActivityType.STATUS_CHANGED,
          actorUserId: command.actorUserId,
          fromUserId: ticket.props.assigneeUserId,
          toUserId: ticket.props.assigneeUserId,
          message: `${ticket.props.status} -> ${TicketStatus.IN_PROGRESS}`,
        }),
      );
    }

    const updated = await this.ticketRepository.update(ticketId, {
      acknowledgedAt: new Date(),
      status: shouldMoveIntoWork
        ? TicketStatus.IN_PROGRESS
        : ticket.props.status,
      activities: nextActivities,
    });

    if (!updated) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return updated;
  }
}

export class AddTicketCommentUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(
    ticketId: string,
    command: AddTicketCommentCommand,
  ): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    const comment = command.comment.trim();
    if (!comment) {
      throw new BadRequestUseCaseError('Comment cannot be empty.');
    }

    const updated = await this.ticketRepository.update(ticketId, {
      activities: [
        ...(ticket.props.activities ?? []),
        createActivity({
          type: TicketActivityType.COMMENT_ADDED,
          actorUserId: command.actorUserId,
          actorDisplayName: command.actorDisplayName,
          actorRole: command.actorRole,
          message: comment,
        }),
      ],
    });

    if (!updated) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return updated;
  }
}

export class AttachTicketEvidenceUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(
    ticketId: string,
    command: AttachTicketEvidenceCommand,
  ): Promise<TicketEvidence> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    if (
      ticket.props.status === TicketStatus.CLOSED ||
      ticket.props.status === TicketStatus.CANCELLED
    ) {
      throw new BadRequestUseCaseError(
        'Evidence cannot be attached to a closed or cancelled ticket.',
      );
    }

    const storageKey = command.storageKey?.trim();
    const url = command.url?.trim();
    const note = command.note?.trim();
    if (!storageKey && !url && !note) {
      throw new BadRequestUseCaseError(
        'Evidence must include a storage key, URL, or note.',
      );
    }

    const evidence: TicketEvidence = {
      id: randomUUID(),
      type: command.type,
      attachedByUserId: command.actorUserId,
      storageKey,
      url,
      fileName: command.fileName?.trim(),
      mimeType: command.mimeType?.trim(),
      sizeBytes: command.sizeBytes,
      note,
      metadata: command.metadata ?? {},
      createdAt: new Date(),
    };

    const updated = await this.ticketRepository.update(ticketId, {
      evidence: [...(ticket.props.evidence ?? []), evidence],
      activities: [
        ...(ticket.props.activities ?? []),
        createActivity({
          type: TicketActivityType.EVIDENCE_ATTACHED,
          actorUserId: command.actorUserId,
          message: note ?? command.fileName ?? url ?? storageKey,
        }),
      ],
    });

    if (!updated) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return evidence;
  }
}

export class CreateTicketEvidenceUploadUrlUseCase {
  constructor(
    private readonly ticketRepository: TicketRepositoryPort,
    private readonly objectStorage: ObjectStoragePort,
    private readonly storageKeyPrefix: string,
    private readonly expiresInSeconds: number,
  ) {}

  async execute(
    ticketId: string,
    command: CreateTicketEvidenceUploadUrlCommand,
  ): Promise<TicketEvidenceUploadTarget> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    if (
      ticket.props.status === TicketStatus.CLOSED ||
      ticket.props.status === TicketStatus.CANCELLED
    ) {
      throw new BadRequestUseCaseError(
        'Evidence upload URLs cannot be created for a closed or cancelled ticket.',
      );
    }

    if (!UPLOADABLE_EVIDENCE_TYPES.has(command.type)) {
      throw new BadRequestUseCaseError(
        `Evidence type ${command.type} does not support object uploads.`,
      );
    }

    if (!this.objectStorage.isConfigured()) {
      throw new ServiceUnavailableUseCaseError(
        'Cloudflare R2 upload storage is not configured.',
      );
    }

    const sanitizedFileName = sanitizeFileName(command.fileName);
    if (!sanitizedFileName) {
      throw new BadRequestUseCaseError('File name is invalid.');
    }

    const storageKey = [
      this.storageKeyPrefix,
      ticketId,
      command.type.toLowerCase(),
      `${randomUUID()}-${sanitizedFileName}`,
    ].join('/');

    const uploadTarget = await this.objectStorage.createPresignedUpload({
      objectKey: storageKey,
      contentType: command.mimeType.trim(),
      expiresInSeconds: this.expiresInSeconds,
    });

    return {
      ...uploadTarget,
      type: command.type,
      fileName: sanitizedFileName,
      mimeType: command.mimeType.trim(),
      storageKey,
    };
  }
}

export class ListTicketEvidenceUseCase {
  constructor(private readonly ticketRepository: TicketRepositoryPort) {}

  async execute(ticketId: string): Promise<TicketEvidence[]> {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundUseCaseError(`Ticket ${ticketId} was not found.`);
    }

    return ticket.props.evidence ?? [];
  }
}
