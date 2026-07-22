import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type { AlertIncidentHandoffAuditResult } from '../../../application/ports/alert-incident-handoff-audit.repository';

@Schema({
  collection: 'alert_incident_handoff_audits',
  timestamps: true,
  versionKey: false,
})
export class AlertIncidentHandoffAuditPersistence {
  @Prop({ required: true, index: true })
  fingerprint!: string;

  @Prop({
    required: true,
    enum: ['incident_escalation_requested'],
    index: true,
  })
  action!: 'incident_escalation_requested';

  @Prop({ required: true, index: true })
  actorUserId!: string;

  @Prop({ required: true })
  actorUsername!: string;

  @Prop({ required: true })
  actorDisplayName!: string;

  @Prop({ required: true, index: true })
  actorSessionId!: string;

  @Prop({ type: String, required: false, default: null, index: true })
  correlationId!: string | null;

  @Prop({
    type: String,
    required: false,
    enum: ['HIGH', 'CRITICAL', null],
    default: null,
  })
  severityOverride!: 'HIGH' | 'CRITICAL' | null;

  @Prop({ type: String, required: false, default: null })
  operatorNote!: string | null;

  @Prop({ required: true, index: true })
  requestedAt!: string;

  @Prop({
    required: true,
    enum: ['requested', 'created', 'already_linked', 'linked_existing', 'failed'],
    index: true,
  })
  result!: AlertIncidentHandoffAuditResult;

  @Prop({ type: String, required: false, default: null, index: true })
  incidentId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  incidentCode!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  failureCode!: string | null;

  @Prop({ type: String, required: false, default: null })
  failureDetail!: string | null;

  createdAt?: Date;

  updatedAt?: Date;
}

export type AlertIncidentHandoffAuditDocument =
  HydratedDocument<AlertIncidentHandoffAuditPersistence>;

export const AlertIncidentHandoffAuditSchema = SchemaFactory.createForClass(
  AlertIncidentHandoffAuditPersistence,
);

AlertIncidentHandoffAuditSchema.index({ fingerprint: 1, requestedAt: -1 });
AlertIncidentHandoffAuditSchema.index({ actorUserId: 1, requestedAt: -1 });
AlertIncidentHandoffAuditSchema.index({ result: 1, requestedAt: -1 });
