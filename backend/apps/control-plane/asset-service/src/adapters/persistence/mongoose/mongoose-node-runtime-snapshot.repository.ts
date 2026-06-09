import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NodeRuntimeSnapshotDocumentModel } from '@adapters/persistence/mongoose/asset-context.models';
import { getDocumentId } from '@adapters/persistence/mongoose/mongoose-document.mapper';
import type { NodeRuntimeSnapshotEntity } from '@domain/entities/asset-context.entities';
import type { NodeRuntimeSnapshotRepositoryPort } from '@domain/ports/repositories.port';

function mapSnapshot(
  document: NodeRuntimeSnapshotDocumentModel & { _id: { toString(): string } },
): NodeRuntimeSnapshotEntity {
  return {
    id: getDocumentId(document),
    nodeId: document.nodeId,
    healthState: document.healthState,
    heartbeatAt: document.heartbeatAt,
    metricsAt: document.metricsAt,
    cpuUsagePct: document.cpuUsagePct,
    memoryUsagePct: document.memoryUsagePct,
    networkRxKbps: document.networkRxKbps,
    networkTxKbps: document.networkTxKbps,
    activeAlertCount: document.activeAlertCount,
    source: document.source,
    metadata: document.metadata ?? {},
  };
}

@Injectable()
export class MongooseNodeRuntimeSnapshotRepository implements NodeRuntimeSnapshotRepositoryPort {
  constructor(
    @InjectModel(NodeRuntimeSnapshotDocumentModel.name)
    private readonly snapshotModel: Model<NodeRuntimeSnapshotDocumentModel>,
  ) {}

  async upsert(
    input: Omit<NodeRuntimeSnapshotEntity, 'id'>,
  ): Promise<NodeRuntimeSnapshotEntity> {
    const document = await this.snapshotModel.findOneAndUpdate(
      { nodeId: input.nodeId },
      input,
      { upsert: true, new: true },
    );

    return mapSnapshot(document);
  }

  async findByNodeId(
    nodeId: string,
  ): Promise<NodeRuntimeSnapshotEntity | null> {
    const document = await this.snapshotModel.findOne({ nodeId });
    return document ? mapSnapshot(document) : null;
  }

  async listAll(): Promise<NodeRuntimeSnapshotEntity[]> {
    const documents = await this.snapshotModel.find().sort({ nodeId: 1 });
    return documents.map((document) =>
      mapSnapshot(
        document as NodeRuntimeSnapshotDocumentModel & {
          _id: { toString(): string };
        },
      ),
    );
  }
}
