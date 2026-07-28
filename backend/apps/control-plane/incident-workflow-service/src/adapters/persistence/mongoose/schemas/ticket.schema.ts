import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { TicketActivityType } from '@domain/constants/ticket-activity-type.enum';
import { TicketPriority } from '@domain/constants/ticket-priority.enum';
import { TicketStatus } from '@domain/constants/ticket-status.enum';
import { TicketEvidenceType } from '@domain/constants/ticket-evidence-type.enum';
import { TicketAssetType } from '@domain/constants/ticket-asset-type.enum';

@Schema({ _id: false, versionKey: false })
export class TicketAssetReferenceDocumentModel {
  @Prop({ type: String, required: true, enum: Object.values(TicketAssetType) })
  type!: TicketAssetType;

  @Prop({ required: true, trim: true })
  assetId!: string;

  @Prop({ required: true, trim: true })
  code!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ type: String, trim: true })
  rackId?: string;

  @Prop({ type: String, trim: true })
  rackCode?: string;
}

@Schema({ _id: false, versionKey: false })
export class TicketEvidenceDocumentModel {
  @Prop({ required: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, enum: Object.values(TicketEvidenceType) })
  type!: TicketEvidenceType;

  @Prop({ required: true, trim: true })
  attachedByUserId!: string;

  @Prop({ type: String, trim: true })
  storageKey?: string;

  @Prop({ type: String, trim: true })
  url?: string;

  @Prop({ type: String, trim: true })
  fileName?: string;

  @Prop({ type: String, trim: true })
  mimeType?: string;

  @Prop({ type: Number, min: 0 })
  sizeBytes?: number;

  @Prop({ type: String, trim: true })
  note?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ required: true })
  createdAt!: Date;
}

@Schema({ _id: false, versionKey: false })
export class TicketActivityDocumentModel {
  @Prop({ required: true, trim: true })
  id!: string;

  @Prop({ type: String, required: true, enum: Object.values(TicketActivityType) })
  type!: TicketActivityType;

  @Prop({ type: String })
  actorUserId?: string;

  @Prop({ type: String, required: false, default: null })
  fromUserId?: string | null;

  @Prop({ type: String, required: false, default: null })
  toUserId?: string | null;

  @Prop({ type: String })
  message?: string;

  @Prop({ required: true })
  createdAt!: Date;
}

@Schema({ collection: 'tickets', timestamps: true, versionKey: false })
export class TicketDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  ticketCode!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, required: true, enum: Object.values(TicketPriority) })
  priority!: TicketPriority;

  @Prop({ type: String, required: true, enum: Object.values(TicketStatus) })
  status!: TicketStatus;

  @Prop()
  incidentId?: string;

  @Prop()
  ownerUserId?: string;

  @Prop()
  assigneeUserId?: string;

  @Prop()
  assignedAt?: Date;

  @Prop()
  acknowledgedAt?: Date;

  @Prop({ type: [TicketActivityDocumentModel], default: [] })
  activities!: TicketActivityDocumentModel[];

  @Prop({ type: [TicketEvidenceDocumentModel], default: [] })
  evidence!: TicketEvidenceDocumentModel[];

  @Prop({
    type: TicketAssetReferenceDocumentModel,
    required: false,
    default: null,
  })
  assetRef?: TicketAssetReferenceDocumentModel | null;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export type TicketDocument = HydratedDocument<TicketDocumentModel>;
export const TicketSchema = SchemaFactory.createForClass(TicketDocumentModel);
