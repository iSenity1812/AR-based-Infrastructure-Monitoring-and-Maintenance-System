import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NodeDocumentModel } from '@adapters/persistence/mongoose/asset-context.models';
import { getDocumentId } from '@adapters/persistence/mongoose/mongoose-document.mapper';
import type { NodeEntity } from '@domain/entities/asset-context.entities';
import type { NodeRepositoryPort } from '@domain/ports/repositories.port';

function mapNode(
  document: NodeDocumentModel & { _id: { toString(): string } },
): NodeEntity {
  return {
    id: getDocumentId(document),
    nodeCode: document.nodeCode,
    displayName: document.displayName,
    hostname: document.hostname,
    rackId: document.rackId,
    nodeType: document.nodeType,
    source: document.source,
    lifecycleState: document.lifecycleState,
    assignmentState: document.assignmentState,
    serialNumber: document.serialNumber,
    vendor: document.vendor,
    model: document.model,
    managementIp: document.managementIp,
    notes: document.notes,
    metadata: document.metadata ?? {},
  };
}

@Injectable()
export class MongooseNodeRepository implements NodeRepositoryPort {
  constructor(
    @InjectModel(NodeDocumentModel.name)
    private readonly nodeModel: Model<NodeDocumentModel>,
  ) {}

  async create(input: Omit<NodeEntity, 'id'>): Promise<NodeEntity> {
    return mapNode(await this.nodeModel.create(input));
  }

  async update(
    id: string,
    input: Partial<Omit<NodeEntity, 'id'>>,
  ): Promise<NodeEntity | null> {
    const document = await this.nodeModel.findByIdAndUpdate(id, input, {
      new: true,
    });
    return document ? mapNode(document) : null;
  }

  async findById(id: string): Promise<NodeEntity | null> {
    const document = await this.nodeModel.findById(id);
    return document ? mapNode(document) : null;
  }

  async findByCode(nodeCode: string): Promise<NodeEntity | null> {
    const document = await this.nodeModel.findOne({ nodeCode });
    return document ? mapNode(document) : null;
  }

  async listAll(): Promise<NodeEntity[]> {
    const documents = await this.nodeModel.find().sort({ nodeCode: 1 });
    return documents.map((document) =>
      mapNode(document as NodeDocumentModel & { _id: { toString(): string } }),
    );
  }

  async listByRackId(rackId: string): Promise<NodeEntity[]> {
    const documents = await this.nodeModel
      .find({ rackId })
      .sort({ nodeCode: 1 });
    return documents.map((document) =>
      mapNode(document as NodeDocumentModel & { _id: { toString(): string } }),
    );
  }
}
