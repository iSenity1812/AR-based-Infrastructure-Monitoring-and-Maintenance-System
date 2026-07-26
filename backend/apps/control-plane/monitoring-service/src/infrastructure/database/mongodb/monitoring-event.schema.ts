import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type {
  MonitoringTimelineCategory,
  MonitoringTimelineSource,
} from '../../../application/ports/monitoring-event.repository';

@Schema({
  collection: 'monitoring_events',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class MonitoringEventPersistence {
  @Prop({ required: true, unique: true, index: true })
  eventKey!: string;

  @Prop({ required: true, index: true })
  occurredAt!: Date;

  @Prop({ required: true, enum: ['monitoring', 'alert'] })
  category!: MonitoringTimelineCategory;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true, enum: ['node', 'rack'], index: true })
  scopeType!: 'node' | 'rack';

  @Prop({ required: true, index: true })
  scopeId!: string;

  @Prop({ type: String, required: false, default: null, index: true })
  nodeId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  rackId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  fingerprint!: string | null;

  @Prop({ type: String, required: false, default: null })
  incidentCode!: string | null;

  @Prop({
    required: true,
    enum: ['monitoring-service', 'external-alert-sync', 'node-liveness-sync'],
  })
  source!: MonitoringTimelineSource;

  @Prop({ type: Object, required: true, default: {} })
  data!: Record<string, unknown>;

  createdAt?: Date;
}

export type MonitoringEventDocument = HydratedDocument<MonitoringEventPersistence>;

export const MonitoringEventSchema = SchemaFactory.createForClass(
  MonitoringEventPersistence,
);

MonitoringEventSchema.index({ scopeType: 1, scopeId: 1, occurredAt: 1 });
MonitoringEventSchema.index({ fingerprint: 1, occurredAt: 1 });
MonitoringEventSchema.index({ rackId: 1, occurredAt: 1 });
MonitoringEventSchema.index({ nodeId: 1, occurredAt: 1 });
