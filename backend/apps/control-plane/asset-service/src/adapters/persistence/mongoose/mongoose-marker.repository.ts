import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MarkerDocumentModel } from '@adapters/persistence/mongoose/asset-context.models';
import { getDocumentId } from '@adapters/persistence/mongoose/mongoose-document.mapper';
import type { MarkerEntity } from '@domain/entities/asset-context.entities';
import type { MarkerRepositoryPort } from '@domain/ports/repositories.port';

function mapMarker(
  document: MarkerDocumentModel & { _id: { toString(): string } },
): MarkerEntity {
  return {
    id: getDocumentId(document),
    markerCode: document.markerCode,
    displayLabel: document.displayLabel,
    lifecycleState: document.lifecycleState,
    targetType: document.targetType as MarkerEntity['targetType'],
    targetId: document.targetId,
    bindingStatus: document.bindingStatus,
    isActive: document.isActive,
    isVisibleInAr: document.isVisibleInAr,
    imageTargetId: document.imageTargetId,
    worldTrackingEnabled: document.worldTrackingEnabled,
    lastValidatedAt: document.lastValidatedAt,
    notes: document.notes,
    metadata: document.metadata ?? {},
  };
}

@Injectable()
export class MongooseMarkerRepository implements MarkerRepositoryPort {
  constructor(
    @InjectModel(MarkerDocumentModel.name)
    private readonly markerModel: Model<MarkerDocumentModel>,
  ) {}

  async create(input: Omit<MarkerEntity, 'id'>): Promise<MarkerEntity> {
    return mapMarker(await this.markerModel.create(input));
  }

  async update(
    id: string,
    input: Partial<Omit<MarkerEntity, 'id'>>,
  ): Promise<MarkerEntity | null> {
    const document = await this.markerModel.findByIdAndUpdate(id, input, {
      new: true,
    });
    return document ? mapMarker(document) : null;
  }

  async findById(id: string): Promise<MarkerEntity | null> {
    const document = await this.markerModel.findById(id);
    return document ? mapMarker(document) : null;
  }

  async findByCode(markerCode: string): Promise<MarkerEntity | null> {
    const document = await this.markerModel.findOne({ markerCode });
    return document ? mapMarker(document) : null;
  }

  async listAll(): Promise<MarkerEntity[]> {
    const documents = await this.markerModel.find().sort({ markerCode: 1 });
    return documents.map((document) =>
      mapMarker(
        document as MarkerDocumentModel & { _id: { toString(): string } },
      ),
    );
  }

  async listByTarget(
    targetType: string,
    targetId: string,
  ): Promise<MarkerEntity[]> {
    const documents = await this.markerModel
      .find({ targetType, targetId })
      .sort({ markerCode: 1 });

    return documents.map((document) =>
      mapMarker(
        document as MarkerDocumentModel & { _id: { toString(): string } },
      ),
    );
  }
}
