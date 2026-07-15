import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type {
  MonitoringLifecycleStatus,
  MonitoringScopeType,
  NotificationSyncStatus,
} from '../../../domain/monitoring-state';

@Schema({
  collection: 'monitoring_states',
  timestamps: true,
  versionKey: false,
})
export class MonitoringStatePersistence {
  @Prop({ required: true })
  scopeType!: MonitoringScopeType;

  @Prop({ required: true })
  scopeId!: string;

  @Prop({ required: true, unique: true, index: true })
  scopeKey!: string;

  @Prop({ required: true })
  fingerprint!: string;

  @Prop({ required: true })
  severityCode!: number;

  @Prop({ required: true })
  overrideFlag!: boolean;

  @Prop({ required: true })
  lifecycleStatus!: MonitoringLifecycleStatus;

  @Prop({ required: true })
  notificationSyncStatus!: NotificationSyncStatus;

  @Prop({ required: true })
  firstObservedAt!: string;

  @Prop({ required: true })
  lastObservedAt!: string;

  @Prop({ required: true })
  lastStateChangedAt!: string;

  @Prop({ type: String, required: false })
  openedAt!: string | null;

  @Prop({ type: String, required: false })
  resolvedAt!: string | null;

  @Prop({ type: String, required: false })
  lastNotificationAttemptAt!: string | null;

  @Prop({ type: String, required: false })
  lastNotificationSyncedAt!: string | null;

  createdAt?: Date;

  updatedAt?: Date;
}

export type MonitoringStateDocument =
  HydratedDocument<MonitoringStatePersistence>;

export const MonitoringStateSchema = SchemaFactory.createForClass(
  MonitoringStatePersistence,
);
