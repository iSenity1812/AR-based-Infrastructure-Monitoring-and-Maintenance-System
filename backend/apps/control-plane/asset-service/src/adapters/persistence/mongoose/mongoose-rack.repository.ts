import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { RackDocumentModel } from '@adapters/persistence/mongoose/asset-context.models';
import { getDocumentId } from '@adapters/persistence/mongoose/mongoose-document.mapper';
import type { RackEntity } from '@domain/entities/asset-context.entities';
import type { RackRepositoryPort } from '@domain/ports/repositories.port';

function mapRack(
  document: RackDocumentModel & { _id: { toString(): string } },
): RackEntity {
  return {
    id: getDocumentId(document),
    rackCode: document.rackCode,
    displayName: document.displayName,
    lifecycleState: document.lifecycleState,
    capacityState: document.capacityState,
    siteCode: document.siteCode,
    roomCode: document.roomCode,
    zoneCode: document.zoneCode,
    rowCode: document.rowCode,
    positionCode: document.positionCode,
    capacityLimit: document.capacityLimit,
    notes: document.notes,
    vendor: document.vendor,
    metadata: document.metadata ?? {},
  };
}

@Injectable()
export class MongooseRackRepository implements RackRepositoryPort {
  constructor(
    @InjectModel(RackDocumentModel.name)
    private readonly rackModel: Model<RackDocumentModel>,
  ) {}

  async create(input: Omit<RackEntity, 'id'>): Promise<RackEntity> {
    return mapRack(await this.rackModel.create(input));
  }

  async update(
    id: string,
    input: Partial<Omit<RackEntity, 'id'>>,
  ): Promise<RackEntity | null> {
    const document = await this.rackModel.findByIdAndUpdate(id, input, {
      new: true,
    });
    return document ? mapRack(document) : null;
  }

  async findById(id: string): Promise<RackEntity | null> {
    const document = await this.rackModel.findById(id);
    return document ? mapRack(document) : null;
  }

  async findByCode(rackCode: string): Promise<RackEntity | null> {
    const document = await this.rackModel.findOne({ rackCode });
    return document ? mapRack(document) : null;
  }

  async listAll(): Promise<RackEntity[]> {
    const documents = await this.rackModel.find().sort({ rackCode: 1 });
    return documents.map((document) =>
      mapRack(document as RackDocumentModel & { _id: { toString(): string } }),
    );
  }
}
