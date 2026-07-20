import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import {
  MarkerLifecycleState,
  NodeAssignmentState,
  NodeHealthState,
  NodeLifecycleState,
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';

@Schema({ collection: 'racks', timestamps: true, versionKey: false })
export class RackDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  rackCode!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ required: true, enum: Object.values(RackLifecycleState) })
  lifecycleState!: RackLifecycleState;

  @Prop({ required: true, enum: Object.values(RackCapacityState) })
  capacityState!: RackCapacityState;

  @Prop()
  siteCode?: string;

  @Prop()
  roomCode?: string;

  @Prop()
  zoneCode?: string;

  @Prop()
  rowCode?: string;

  @Prop()
  positionCode?: string;

  @Prop()
  capacityLimit?: number;

  @Prop()
  notes?: string;

  @Prop()
  vendor?: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export type RackDocument = HydratedDocument<RackDocumentModel>;
export const RackSchema = SchemaFactory.createForClass(RackDocumentModel);

@Schema({ collection: 'nodes', timestamps: true, versionKey: false })
export class NodeDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  nodeCode!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop()
  hostname?: string;

  @Prop()
  rackId?: string;

  @Prop()
  positionCode?: string;

  @Prop()
  nodeType?: string;

  @Prop({ required: true, trim: true })
  source!: string;

  @Prop({ required: true, enum: Object.values(NodeLifecycleState) })
  lifecycleState!: NodeLifecycleState;

  @Prop({ required: true, enum: Object.values(NodeAssignmentState) })
  assignmentState!: NodeAssignmentState;

  @Prop()
  serialNumber?: string;

  @Prop()
  vendor?: string;

  @Prop()
  model?: string;

  @Prop()
  managementIp?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export type NodeDocument = HydratedDocument<NodeDocumentModel>;
export const NodeSchema = SchemaFactory.createForClass(NodeDocumentModel);
NodeSchema.index(
  { rackId: 1, positionCode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      rackId: { $exists: true, $gt: '' },
      positionCode: { $exists: true, $gt: '' },
    },
  },
);
NodeSchema.index({ assignmentState: 1 });

@Schema({ collection: 'markers', timestamps: true, versionKey: false })
export class MarkerDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  markerCode!: string;

  @Prop()
  displayLabel?: string;

  @Prop({ required: true, enum: Object.values(MarkerLifecycleState) })
  lifecycleState!: MarkerLifecycleState;

  @Prop({ enum: ['rack', 'node'] })
  targetType?: string;

  @Prop()
  targetId?: string;

  @Prop({ required: true })
  bindingStatus!: string;

  @Prop({ required: true, default: false })
  isActive!: boolean;

  @Prop({ required: true, default: false })
  isVisibleInAr!: boolean;

  @Prop()
  imageTargetId?: string;

  @Prop({ required: true, default: true })
  worldTrackingEnabled!: boolean;

  @Prop()
  lastValidatedAt?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export type MarkerDocument = HydratedDocument<MarkerDocumentModel>;
export const MarkerSchema = SchemaFactory.createForClass(MarkerDocumentModel);

@Schema({
  collection: 'node_runtime_snapshots',
  timestamps: true,
  versionKey: false,
})
export class NodeRuntimeSnapshotDocumentModel {
  @Prop({ required: true, unique: true, trim: true })
  nodeId!: string;

  @Prop({ required: true, enum: Object.values(NodeHealthState) })
  healthState!: NodeHealthState;

  @Prop()
  heartbeatAt?: string;

  @Prop()
  metricsAt?: string;

  @Prop()
  cpuUsagePct?: number;

  @Prop()
  memoryUsagePct?: number;

  @Prop()
  networkRxKbps?: number;

  @Prop()
  networkTxKbps?: number;

  @Prop()
  activeAlertCount?: number;

  @Prop({ required: true, trim: true })
  source!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export type NodeRuntimeSnapshotDocument =
  HydratedDocument<NodeRuntimeSnapshotDocumentModel>;
export const NodeRuntimeSnapshotSchema = SchemaFactory.createForClass(
  NodeRuntimeSnapshotDocumentModel,
);
