import { AssetType } from '../constants/asset-type.enum';
import type {
  DiscoveredNodeEntity,
  MarkerEntity,
  NodeEntity,
  NodeLifecycleState,
  NodeRuntimeSnapshotEntity,
  RackEntity,
} from '../entities/asset-context.entities';

export interface RackRepositoryPort {
  create(this: void, input: Omit<RackEntity, 'id'>): Promise<RackEntity>;
  update(
    this: void,
    id: string,
    input: Partial<Omit<RackEntity, 'id'>>,
  ): Promise<RackEntity | null>;
  findById(this: void, id: string): Promise<RackEntity | null>;
  findByCode(this: void, rackCode: string): Promise<RackEntity | null>;
  listAll(this: void): Promise<RackEntity[]>;
}

export interface NodeRepositoryPort {
  create(this: void, input: Omit<NodeEntity, 'id'>): Promise<NodeEntity>;
  update(
    this: void,
    id: string,
    input: Partial<Omit<NodeEntity, 'id'>>,
  ): Promise<NodeEntity | null>;
  findById(this: void, id: string): Promise<NodeEntity | null>;
  findByCode(this: void, nodeCode: string): Promise<NodeEntity | null>;
  findByRackIdAndPositionCode(
    this: void,
    rackId: string,
    positionCode: string,
  ): Promise<NodeEntity | null>;
  listAll(this: void): Promise<NodeEntity[]>;
  listByRackId(this: void, rackId: string): Promise<NodeEntity[]>;
  listUnassigned(
    this: void,
    filter?: { lifecycleState?: NodeLifecycleState },
  ): Promise<NodeEntity[]>;
}

export interface MarkerRepositoryPort {
  create(this: void, input: Omit<MarkerEntity, 'id'>): Promise<MarkerEntity>;
  update(
    this: void,
    id: string,
    input: Partial<Omit<MarkerEntity, 'id'>>,
  ): Promise<MarkerEntity | null>;
  findById(this: void, id: string): Promise<MarkerEntity | null>;
  findByCode(this: void, markerCode: string): Promise<MarkerEntity | null>;
  listAll(this: void): Promise<MarkerEntity[]>;
  listByTarget(
    this: void,
    targetType: string,
    targetId: string,
  ): Promise<MarkerEntity[]>;
}

export interface NodeRuntimeSnapshotRepositoryPort {
  upsert(
    this: void,
    input: Omit<NodeRuntimeSnapshotEntity, 'id'>,
  ): Promise<NodeRuntimeSnapshotEntity>;
  findByNodeId(
    this: void,
    nodeId: string,
  ): Promise<NodeRuntimeSnapshotEntity | null>;
  listAll(this: void): Promise<NodeRuntimeSnapshotEntity[]>;
}

export interface DiscoveredNodeRepositoryPort {
  listAll(this: void): Promise<DiscoveredNodeEntity[]>;
  findByAgentId(
    this: void,
    agentId: string,
  ): Promise<DiscoveredNodeEntity | null>;
  save(this: void, node: DiscoveredNodeEntity): Promise<DiscoveredNodeEntity>;
}

export interface AssetSearchResult {
  id: string;
  type: AssetType;
  code: string;
  name: string;
  lifecycleState?: string;
}

export interface AssetQueryCachePort {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
}
