import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

import type {
  AppendMonitoringEventResult,
  MonitoringEvent,
} from '../../../application/ports/monitoring-event.repository';
import { MonitoringEventRepository } from '../../../application/ports/monitoring-event.repository';
import {
  MonitoringEventPersistence,
  type MonitoringEventDocument,
} from './monitoring-event.schema';

@Injectable()
export class MonitoringEventMongoRepository
  implements MonitoringEventRepository
{
  constructor(
    @InjectModel(MonitoringEventPersistence.name)
    private readonly monitoringEventModel: Model<MonitoringEventDocument>,
  ) {}

  async append(
    event: MonitoringEvent,
  ): Promise<AppendMonitoringEventResult> {
    try {
      await this.monitoringEventModel.create(
        mapMonitoringEventToPersistence(event),
      );
      return { inserted: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return { inserted: false };
      }

      throw error;
    }
  }

  async listByScopeAndWindow(input: {
    scopeType: 'node' | 'rack';
    scopeId: string;
    from: string;
    to: string;
  }): Promise<MonitoringEvent[]> {
    const documents = await this.monitoringEventModel
      .find({
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        occurredAt: {
          $gte: new Date(input.from),
          $lte: new Date(input.to),
        },
      })
      .sort({
        occurredAt: 1,
        eventKey: 1,
      })
      .lean<MonitoringEventPersistence[]>()
      .exec();

    return documents.map(mapDocumentToMonitoringEvent);
  }
}

export function mapMonitoringEventToPersistence(
  event: MonitoringEvent,
): MonitoringEventPersistence {
  return {
    eventKey: event.eventKey,
    occurredAt: new Date(event.occurredAt),
    category: event.category,
    type: event.type,
    scopeType: event.scopeType,
    scopeId: event.scopeId,
    nodeId: event.nodeId ?? null,
    rackId: event.rackId ?? null,
    fingerprint: event.fingerprint ?? null,
    incidentCode: event.incidentCode ?? null,
    source: event.source,
    data: event.data,
    createdAt: event.createdAt ? new Date(event.createdAt) : undefined,
  };
}

export function mapDocumentToMonitoringEvent(
  document: MonitoringEventPersistence,
): MonitoringEvent {
  return {
    eventKey: document.eventKey,
    occurredAt: document.occurredAt.toISOString(),
    category: document.category,
    type: document.type,
    scopeType: document.scopeType,
    scopeId: document.scopeId,
    nodeId: document.nodeId ?? null,
    rackId: document.rackId ?? null,
    fingerprint: document.fingerprint ?? null,
    incidentCode: document.incidentCode ?? null,
    source: document.source,
    data: document.data ?? {},
    createdAt: document.createdAt?.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
}
