import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  IncidentEntity,
  type IncidentCapturedSnapshot,
} from '@domain/entities/incident.entity';
import type {
  CreateIncidentRecord,
  IncidentListQuery,
  IncidentRepositoryPort,
  IncidentUpdateRecord,
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
    capturedSnapshot: parseCapturedSnapshot(document.capturedSnapshot),
    createdAt: persisted.createdAt ?? new Date(),
    updatedAt: persisted.updatedAt ?? new Date(),
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
}

function isIsoDateString(input: unknown): input is string {
  return (
    typeof input === 'string' &&
    input.trim().length > 0 &&
    !Number.isNaN(Date.parse(input))
  );
}

function parseCapturedSnapshot(
  input: unknown,
): IncidentCapturedSnapshot | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const window = isRecord(input.window) ? input.window : null;
  const scope = isRecord(input.scope) ? input.scope : null;
  const unavailableSources = Array.isArray(input.unavailableSources)
    ? input.unavailableSources
    : [];

  if (
    input.schemaVersion !== 'incident.context.v1' ||
    !isIsoDateString(input.capturedAt) ||
    !window ||
    !isIsoDateString(window.from) ||
    !isIsoDateString(window.to) ||
    window.interval !== '1m' ||
    (input.completeness !== 'complete' &&
      input.completeness !== 'partial' &&
      input.completeness !== 'minimal') ||
    !unavailableSources.every(
      (item) =>
        isRecord(item) &&
        typeof item.source === 'string' &&
        item.source.trim().length > 0 &&
        typeof item.reasonCode === 'string' &&
        item.reasonCode.trim().length > 0,
    ) ||
    !isRecord(input.alert) ||
    !scope ||
    typeof scope.scopeType !== 'string' ||
    scope.scopeType.trim().length === 0 ||
    typeof scope.scopeId !== 'string' ||
    scope.scopeId.trim().length === 0
  ) {
    return undefined;
  }

  return input as unknown as IncidentCapturedSnapshot;
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

    if (query.scopeType?.trim() && query.scopeId?.trim()) {
      filter.$or = buildScopeFilters(
        query.scopeType.trim(),
        query.scopeId.trim(),
      );
    }

    const documents = await this.incidentModel
      .find(filter)
      .sort({ createdAt: -1 });
    return documents.map((document) => mapIncident(document));
  }

  async findRelatedByScope(input: {
    scopeType: string;
    scopeId: string;
    excludeIncidentId: string;
    limit?: number;
  }): Promise<IncidentEntity[]> {
    const scopeType = input.scopeType.trim();
    const scopeId = input.scopeId.trim();
    if (!scopeType || !scopeId) {
      return [];
    }

    const documents = await this.incidentModel
      .find({
        _id: { $ne: input.excludeIncidentId },
        $or: buildScopeFilters(scopeType, scopeId),
      })
      .sort({ createdAt: -1 })
      .limit(input.limit ?? 10);

    return documents.map((document) => mapIncident(document));
  }

  async update(
    incidentId: string,
    input: IncidentUpdateRecord | Partial<CreateIncidentRecord>,
  ): Promise<IncidentEntity | null> {
    const document = await this.incidentModel.findById(incidentId);

    if (!document) {
      return null;
    }

    const nextInput = { ...input };

    if (document.capturedSnapshot && 'capturedSnapshot' in nextInput) {
      delete nextInput.capturedSnapshot;
    }

    document.set(nextInput);
    await document.save();
    return mapIncident(document);
  }
}

function buildMetadataScopeFilter(
  scopeType: string,
  scopeId: string,
): Record<string, unknown> {
  switch (scopeType) {
    case 'node':
      return {
        'metadata.scopeType': 'node',
        'metadata.nodeId': scopeId,
      };
    case 'rack':
      return {
        'metadata.scopeType': 'rack',
        'metadata.rackId': scopeId,
      };
    case 'workload':
      return {
        'metadata.scopeType': 'workload',
        'metadata.workloadId': scopeId,
      };
    case 'service':
      return {
        'metadata.scopeType': 'service',
        'metadata.serviceId': scopeId,
      };
    default:
      return {
        'metadata.scopeType': scopeType,
        'metadata.scopeId': scopeId,
      };
  }
}

function buildScopeFilters(
  scopeType: string,
  scopeId: string,
): Record<string, unknown>[] {
  return [
    {
      'capturedSnapshot.scope.scopeType': scopeType,
      'capturedSnapshot.scope.scopeId': scopeId,
    },
    buildMetadataScopeFilter(scopeType, scopeId),
  ];
}
