import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import {
  TicketEntity,
  type TicketActivityEntry,
} from '@domain/entities/ticket.entity';
import type {
  CreateTicketRecord,
  TicketListQuery,
  TicketRepositoryPort,
} from '@domain/ports/ticket-repository.port';
import { TicketDocument, TicketDocumentModel } from '../schemas/ticket.schema';

function mapTicket(document: TicketDocument): TicketEntity {
  const persisted = document as TicketDocument & {
    createdAt?: Date;
    updatedAt?: Date;
  };

  return new TicketEntity({
    id: document._id.toString(),
    ticketCode: document.ticketCode,
    title: document.title,
    description: document.description,
    priority: document.priority,
    status: document.status,
    incidentId: document.incidentId,
    ownerUserId: document.ownerUserId,
    assigneeUserId: document.assigneeUserId,
    assignedAt: document.assignedAt,
    acknowledgedAt: document.acknowledgedAt,
    activities: (document.activities ?? []).map((activity) => ({
      id: activity.id,
      type: activity.type,
      actorUserId: activity.actorUserId,
      fromUserId: activity.fromUserId,
      toUserId: activity.toUserId,
      message: activity.message,
      createdAt: activity.createdAt,
    })),
    evidence: (document.evidence ?? []).map((evidence) => ({
      id: evidence.id,
      type: evidence.type,
      attachedByUserId: evidence.attachedByUserId,
      storageKey: evidence.storageKey,
      url: evidence.url,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      note: evidence.note,
      metadata: evidence.metadata ?? {},
      createdAt: evidence.createdAt,
    })),
    metadata: document.metadata ?? {},
    createdAt: persisted.createdAt ?? new Date(),
    updatedAt: persisted.updatedAt ?? new Date(),
  });
}

@Injectable()
export class MongooseTicketRepository implements TicketRepositoryPort {
  constructor(
    @InjectModel(TicketDocumentModel.name)
    private readonly ticketModel: Model<TicketDocumentModel>,
  ) {}

  async create(input: CreateTicketRecord): Promise<TicketEntity> {
    return mapTicket(
      await this.ticketModel.create({
        ...input,
        incidentId: input.incidentId ?? undefined,
        ownerUserId: input.ownerUserId ?? undefined,
        assigneeUserId: input.assigneeUserId ?? undefined,
        assignedAt: input.assignedAt ?? undefined,
        acknowledgedAt: input.acknowledgedAt ?? undefined,
      }),
    );
  }

  async findById(ticketId: string): Promise<TicketEntity | null> {
    const document = await this.ticketModel.findById(ticketId);
    return document ? mapTicket(document) : null;
  }

  async findByCode(ticketCode: string): Promise<TicketEntity | null> {
    const document = await this.ticketModel.findOne({ ticketCode });
    return document ? mapTicket(document) : null;
  }

  async findMany(query: TicketListQuery = {}): Promise<TicketEntity[]> {
    const filter: Record<string, unknown> = {};

    if (query.ticketCode?.trim()) {
      filter.ticketCode = new RegExp(query.ticketCode.trim(), 'i');
    }

    if (query.incidentId?.trim()) {
      filter.incidentId = query.incidentId.trim();
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    const documents = await this.ticketModel
      .find(filter)
      .sort({ createdAt: -1 });
    return documents.map((document) => mapTicket(document));
  }

  async update(
    ticketId: string,
    input: Partial<CreateTicketRecord> & {
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
      activities?: TicketActivityEntry[];
      metadata?: Record<string, unknown>;
    },
  ): Promise<TicketEntity | null> {
    const document = await this.ticketModel.findByIdAndUpdate(ticketId, input, {
      returnDocument: 'after',
    });

    return document ? mapTicket(document) : null;
  }

  async delete(ticketId: string): Promise<TicketEntity | null> {
    const document = await this.ticketModel.findByIdAndDelete(ticketId);
    return document ? mapTicket(document) : null;
  }
}
