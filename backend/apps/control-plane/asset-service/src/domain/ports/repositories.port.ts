import { AssetType } from '../constants/asset-type.enum';
import type {
  DiscoveredNodeEntity,
  MarkerEntity,
  NodeEntity,
  NodeRuntimeSnapshotEntity,
  RackEntity,
} from '../entities/asset-context.entities';

export interface RackRepositoryPort {
  create(input: Omit<RackEntity, 'id'>): Promise<RackEntity>;
  update(
    id: string,
    input: Partial<Omit<RackEntity, 'id'>>,
  ): Promise<RackEntity | null>;
  findById(id: string): Promise<RackEntity | null>;
  findByCode(rackCode: string): Promise<RackEntity | null>;
  listAll(): Promise<RackEntity[]>;
}

export interface NodeRepositoryPort {
  create(input: Omit<NodeEntity, 'id'>): Promise<NodeEntity>;
  update(
    id: string,
    input: Partial<Omit<NodeEntity, 'id'>>,
  ): Promise<NodeEntity | null>;
  findById(id: string): Promise<NodeEntity | null>;
  findByCode(nodeCode: string): Promise<NodeEntity | null>;
  findByRackIdAndPositionCode(
    rackId: string,
    positionCode: string,
  ): Promise<NodeEntity | null>;
  listAll(): Promise<NodeEntity[]>;
  listByRackId(rackId: string): Promise<NodeEntity[]>;
}

export interface MarkerRepositoryPort {
  create(input: Omit<MarkerEntity, 'id'>): Promise<MarkerEntity>;
  update(
    id: string,
    input: Partial<Omit<MarkerEntity, 'id'>>,
  ): Promise<MarkerEntity | null>;
  findById(id: string): Promise<MarkerEntity | null>;
  findByCode(markerCode: string): Promise<MarkerEntity | null>;
  listAll(): Promise<MarkerEntity[]>;
  listByTarget(targetType: string, targetId: string): Promise<MarkerEntity[]>;
}

export interface NodeRuntimeSnapshotRepositoryPort {
  upsert(
    input: Omit<NodeRuntimeSnapshotEntity, 'id'>,
  ): Promise<NodeRuntimeSnapshotEntity>;
  findByNodeId(nodeId: string): Promise<NodeRuntimeSnapshotEntity | null>;
  listAll(): Promise<NodeRuntimeSnapshotEntity[]>;
}

export interface DiscoveredNodeRepositoryPort {
  listAll(): Promise<DiscoveredNodeEntity[]>;
  findByAgentId(agentId: string): Promise<DiscoveredNodeEntity | null>;
  save(node: DiscoveredNodeEntity): Promise<DiscoveredNodeEntity>;
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
