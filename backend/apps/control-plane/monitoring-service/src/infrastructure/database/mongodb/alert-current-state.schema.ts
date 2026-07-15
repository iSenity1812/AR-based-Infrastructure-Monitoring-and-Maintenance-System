import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type {
  AlertCurrentStateCategory,
  AlertCurrentStateScopeType,
  AlertCurrentStateSeverity,
  AlertCurrentStateStatus,
} from '../../../domain/alert-current-state';

@Schema({
  collection: 'alert_current_states',
  timestamps: true,
  versionKey: false,
})
export class AlertCurrentStatePersistence {
  @Prop({ required: true, unique: true, index: true })
  fingerprint!: string;

  @Prop({ required: true, index: true })
  alertName!: string;

  @Prop({ type: Object, required: true, default: {} })
  rawLabels!: Record<string, string>;

  @Prop({ type: Object, required: true, default: {} })
  rawAnnotations!: Record<string, string>;

  @Prop({
    required: true,
    enum: ['node', 'rack', 'workload', 'service'],
    index: true,
  })
  scopeType!: AlertCurrentStateScopeType;

  @Prop({ type: String, required: false, default: null, index: true })
  nodeId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  rackId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  workloadId!: string | null;

  @Prop({ type: String, required: false, default: null, index: true })
  serviceId!: string | null;

  @Prop({ required: true, enum: ['warning', 'critical'], index: true })
  severity!: AlertCurrentStateSeverity;

  @Prop({
    required: true,
    enum: [
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ],
    index: true,
  })
  category!: AlertCurrentStateCategory;

  @Prop({ required: true, enum: ['firing', 'resolved'], index: true })
  status!: AlertCurrentStateStatus;

  @Prop({ required: true })
  environment!: string;

  @Prop({ required: true })
  team!: string;

  @Prop({ required: true, enum: ['grafana'] })
  source!: 'grafana';

  @Prop({ required: true })
  summary!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: String, required: false, default: null })
  metricKey!: string | null;

  @Prop({ type: String, required: false, default: null })
  observedWindow!: string | null;

  @Prop({ type: String, required: false, default: null })
  dashboardUrl!: string | null;

  @Prop({ type: String, required: false, default: null })
  runbookUrl!: string | null;

  @Prop({ type: String, required: false, default: null })
  currentValue!: string | null;

  @Prop({ type: String, required: false, default: null })
  threshold!: string | null;

  @Prop({ required: true })
  startsAt!: string;

  @Prop({ type: String, required: false, default: null })
  endsAt!: string | null;

  @Prop({ required: true })
  lastReceivedAt!: string;

  @Prop({ required: true })
  firstSyncedAt!: string;

  @Prop({ required: true })
  lastSyncedAt!: string;

  @Prop({ required: true })
  lastStatusChangedAt!: string;

  createdAt?: Date;

  updatedAt?: Date;
}

export type AlertCurrentStateDocument =
  HydratedDocument<AlertCurrentStatePersistence>;

export const AlertCurrentStateSchema = SchemaFactory.createForClass(
  AlertCurrentStatePersistence,
);

AlertCurrentStateSchema.index({ scopeType: 1, nodeId: 1, status: 1 });
AlertCurrentStateSchema.index({ scopeType: 1, rackId: 1, status: 1 });
AlertCurrentStateSchema.index({ scopeType: 1, workloadId: 1, status: 1 });
AlertCurrentStateSchema.index({ scopeType: 1, serviceId: 1, status: 1 });
AlertCurrentStateSchema.index({ status: 1, severity: 1, lastReceivedAt: -1 });
AlertCurrentStateSchema.index({ alertName: 1, status: 1, severity: 1 });
