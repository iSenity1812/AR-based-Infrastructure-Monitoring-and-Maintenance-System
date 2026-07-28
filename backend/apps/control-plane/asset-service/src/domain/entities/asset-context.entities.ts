import { AssetType } from '../constants/asset-type.enum';
import { MarkerTargetType } from '../constants/marker-target-type.enum';

export enum RackLifecycleState {
  CREATED = 'CREATED',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  DRAINING = 'DRAINING',
  RETIRED = 'RETIRED',
}

export enum RackCapacityState {
  AVAILABLE = 'AVAILABLE',
  EXPANDING = 'EXPANDING',
  FULL = 'FULL',
}

export enum NodeLifecycleState {
  DISCOVERED = 'DISCOVERED',
  READY = 'READY',
  ACTIVE = 'ACTIVE',
  DRAINING = 'DRAINING',
  RETIRED = 'RETIRED',
}

export enum NodeAssignmentState {
  UNASSIGNED = 'UNASSIGNED',
  ASSIGNED = 'ASSIGNED',
  MOVED = 'MOVED',
}

export enum MarkerLifecycleState {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  PRINTED = 'PRINTED',
  MOUNTED = 'MOUNTED',
  VALIDATED = 'VALIDATED',
  ACTIVE = 'ACTIVE',
  REMAPPED = 'REMAPPED',
  RETIRED = 'RETIRED',
}

export enum NodeHealthState {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export interface RackEntity {
  id: string;
  rackCode: string;
  displayName: string;
  lifecycleState: RackLifecycleState;
  capacityState: RackCapacityState;
  siteCode?: string;
  roomCode?: string;
  zoneCode?: string;
  rowCode?: string;
  positionCode?: string;
  capacityLimit?: number;
  notes?: string;
  vendor?: string;
  metadata: Record<string, unknown>;
}

export interface NodeEntity {
  id: string;
  nodeCode: string;
  displayName: string;
  hostname?: string;
  rackId?: string | null;
  positionCode?: string | null;
  nodeType?: string;
  source: string;
  lifecycleState: NodeLifecycleState;
  assignmentState: NodeAssignmentState;
  serialNumber?: string;
  vendor?: string;
  model?: string;
  managementIp?: string;
  notes?: string;
  metadata: Record<string, unknown>;
}

export interface DiscoveredNodeHardwareEntity {
  primaryIpv4?: string;
  macAddress?: string;
  hardwareSerial?: string;
  vendor?: string;
  model?: string;
  osProduct?: string;
  logicalCpuCount?: number;
  cpuArchitecture?: string;
}

export interface DiscoveredNodeEntity {
  agentId: string;
  hostname: string;
  deviceType: string;
  source?: string;
  lifecycleState: NodeLifecycleState;
  assignmentState: NodeAssignmentState;
  logicalRackId?: string | null;
  siteCode?: string;
  hardware: DiscoveredNodeHardwareEntity;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerEntity {
  id: string;
  markerCode: string;
  displayLabel?: string;
  lifecycleState: MarkerLifecycleState;
  targetType?: MarkerTargetType;
  targetId?: string;
  bindingStatus: string;
  isActive: boolean;
  isVisibleInAr: boolean;
  imageTargetId?: string;
  worldTrackingEnabled: boolean;
  lastValidatedAt?: string;
  notes?: string;
  metadata: Record<string, unknown>;
}

export interface NodeRuntimeSnapshotEntity {
  id: string;
  nodeId: string;
  healthState: NodeHealthState;
  heartbeatAt?: string;
  metricsAt?: string;
  cpuUsagePct?: number;
  memoryUsagePct?: number;
  networkRxKbps?: number;
  networkTxKbps?: number;
  activeAlertCount?: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface AssetSummary {
  id: string;
  type: AssetType;
  code: string;
  name: string;
  lifecycleState?: string;
}

export interface RackTopologyResult {
  rack: RackEntity;
  nodes: NodeEntity[];
  nodeRuntimeSnapshots: NodeRuntimeSnapshotEntity[];
  markers: MarkerEntity[];
}

export interface NodeContextResult {
  node: NodeEntity;
  rack?: RackEntity;
  runtimeSnapshot?: NodeRuntimeSnapshotEntity;
  markers: MarkerEntity[];
  topologyPath: {
    rackId?: string;
    rackCode?: string;
  };
  externalContext: {
    workloadSource: 'monitoring-service-or-bff';
  };
}

export interface MarkerResolutionResult {
  marker: MarkerEntity;
  target: AssetSummary;
  rack?: RackEntity;
  node?: NodeEntity;
  runtimeSnapshot?: NodeRuntimeSnapshotEntity;
  topologyPath: {
    rackId?: string;
    rackCode?: string;
  };
  externalContext: {
    workloadSource: 'monitoring-service-or-bff';
  };
}
