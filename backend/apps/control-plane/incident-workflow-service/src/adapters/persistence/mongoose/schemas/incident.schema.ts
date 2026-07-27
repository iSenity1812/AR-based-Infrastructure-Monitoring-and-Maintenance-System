import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import type { IncidentCapturedSnapshot } from '@domain/entities/incident.entity';

@Schema({ _id: false, versionKey: false })
export class IncidentCreatedByDocumentModel {
  @Prop({ required: true, trim: true })
  userId!: string;

  @Prop({ required: true, trim: true })
  username!: string;

  @Prop({ trim: true })
  fullName?: string;

  @Prop({
    required: true,
    enum: ['monitoring_alert_handoff', 'incident_console', 'system'],
  })
  source!: 'monitoring_alert_handoff' | 'incident_console' | 'system';
}

@Schema({ collection: 'incidents', timestamps: true, versionKey: false })
export class IncidentDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  incidentCode!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: Object.values(IncidentSeverity) })
  severity!: IncidentSeverity;

  @Prop({ required: true, enum: Object.values(IncidentStatus) })
  status!: IncidentStatus;

  @Prop({ type: [String], default: [] })
  ticketIds!: string[];

  @Prop({ type: IncidentCreatedByDocumentModel })
  createdBy?: IncidentCreatedByDocumentModel;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  capturedSnapshot?: IncidentCapturedSnapshot;
}

export type IncidentDocument = HydratedDocument<IncidentDocumentModel>;
export const IncidentSchema = SchemaFactory.createForClass(
  IncidentDocumentModel,
);
