import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

import {
  CollectorLivenessRepository,
  type CollectorHeartbeatRecord,
} from '../../../application/ports/collector-liveness.repository';
import {
  CollectorLivenessPersistence,
  type CollectorLivenessDocument,
} from './collector-liveness.schema';

@Injectable()
export class CollectorLivenessMongoRepository
  implements CollectorLivenessRepository
{
  constructor(
    @InjectModel(CollectorLivenessPersistence.name)
    private readonly collectorLivenessModel: Model<CollectorLivenessDocument>,
  ) {}

  async upsertHeartbeat(
    record: CollectorHeartbeatRecord,
  ): Promise<CollectorHeartbeatRecord> {
    await this.collectorLivenessModel
      .updateOne(
        { nodeId: record.nodeId },
        {
          $set: {
            nodeId: record.nodeId,
            agentId: record.agentId,
            lastHeartbeatAt: record.lastHeartbeatAt,
            source: record.source,
            metricKey: record.metricKey,
            sourceMetric: record.sourceMetric,
          },
        },
        { upsert: true },
      )
      .exec();

    const saved = await this.collectorLivenessModel
      .findOne({ nodeId: record.nodeId })
      .lean<CollectorLivenessPersistence | null>()
      .exec();

    if (!saved) {
      return record;
    }

    return mapDocumentToCollectorHeartbeatRecord(saved);
  }

  async findByNodeId(nodeId: string): Promise<CollectorHeartbeatRecord | null> {
    const document = await this.collectorLivenessModel
      .findOne({ nodeId })
      .lean<CollectorLivenessPersistence | null>()
      .exec();

    return document ? mapDocumentToCollectorHeartbeatRecord(document) : null;
  }
}

export function mapDocumentToCollectorHeartbeatRecord(
  document: CollectorLivenessPersistence,
): CollectorHeartbeatRecord {
  return {
    nodeId: document.nodeId,
    agentId: document.agentId ?? null,
    lastHeartbeatAt: document.lastHeartbeatAt,
    source: document.source ?? null,
    metricKey: document.metricKey ?? null,
    sourceMetric: document.sourceMetric ?? null,
    createdAt: document.createdAt?.toISOString(),
    updatedAt: document.updatedAt?.toISOString(),
  };
}
