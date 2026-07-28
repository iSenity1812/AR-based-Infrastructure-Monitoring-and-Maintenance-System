import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'collector_liveness',
  timestamps: true,
  versionKey: false,
})
export class CollectorLivenessPersistence {
  @Prop({ required: true, unique: true, index: true })
  nodeId!: string;

  @Prop({ type: String, required: false })
  agentId!: string | null;

  @Prop({ required: true })
  lastHeartbeatAt!: string;

  @Prop({ type: String, required: false })
  source!: string | null;

  @Prop({ type: String, required: false })
  metricKey!: string | null;

  @Prop({ type: String, required: false })
  sourceMetric!: string | null;

  createdAt?: Date;

  updatedAt?: Date;
}

export type CollectorLivenessDocument =
  HydratedDocument<CollectorLivenessPersistence>;

export const CollectorLivenessSchema = SchemaFactory.createForClass(
  CollectorLivenessPersistence,
);
