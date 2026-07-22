import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IncidentEntity } from '@domain/entities/incident.entity';
import type {
  CreateIncidentRecord,
  IncidentListQuery,
  IncidentRepositoryPort,
} from '@domain/ports/incident-repository.port';
import {
  IncidentDocument,
  IncidentDocumentModel,
} from '../schemas/incident.schema';

function mapIncident(document: IncidentDocument): IncidentEntity {
  const persisted = document as IncidentDocument & {
    createdAt?: Date;
    updatedAt?: Date;
  };

  return new IncidentEntity({
    id: document._id.toString(),
    incidentCode: document.incidentCode,
    title: document.title,
    description: document.description,
    severity: document.severity,
    status: document.status,
    ticketIds: document.ticketIds ?? [],
    createdBy: document.createdBy
      ? {
          userId: document.createdBy.userId,
          username: document.createdBy.username,
          fullName: document.createdBy.fullName,
          source: document.createdBy.source,
        }
      : undefined,
    metadata: document.metadata ?? {},
    createdAt: persisted.createdAt ?? new Date(),
    updatedAt: persisted.updatedAt ?? new Date(),
  });
}

@Injectable()
export class MongooseIncidentRepository implements IncidentRepositoryPort {
  constructor(
    @InjectModel(IncidentDocumentModel.name)
    private readonly incidentModel: Model<IncidentDocumentModel>,
  ) {}

  async create(input: CreateIncidentRecord): Promise<IncidentEntity> {
    return mapIncident(await this.incidentModel.create(input));
  }

  async findById(incidentId: string): Promise<IncidentEntity | null> {
    const document = await this.incidentModel.findById(incidentId);
    return document ? mapIncident(document) : null;
  }

  async findByCode(incidentCode: string): Promise<IncidentEntity | null> {
    const document = await this.incidentModel.findOne({ incidentCode });
    return document ? mapIncident(document) : null;
  }

  async findMany(query: IncidentListQuery = {}): Promise<IncidentEntity[]> {
    const filter: Record<string, unknown> = {};

    if (query.incidentCode?.trim()) {
      filter.incidentCode = new RegExp(query.incidentCode.trim(), 'i');
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.severity) {
      filter.severity = query.severity;
    }

    if (query.ticketId?.trim()) {
      filter.ticketIds = query.ticketId.trim();
    }

    const documents = await this.incidentModel
      .find(filter)
      .sort({ createdAt: -1 });
    return documents.map((document) => mapIncident(document));
  }

  async update(
    incidentId: string,
    input:
      | Partial<Omit<IncidentEntity, 'props' | 'id'>>
      | Partial<CreateIncidentRecord>,
  ): Promise<IncidentEntity | null> {
    const document = await this.incidentModel.findByIdAndUpdate(
      incidentId,
      input,
      {
        returnDocument: 'after',
      },
    );

    return document ? mapIncident(document) : null;
  }
}
