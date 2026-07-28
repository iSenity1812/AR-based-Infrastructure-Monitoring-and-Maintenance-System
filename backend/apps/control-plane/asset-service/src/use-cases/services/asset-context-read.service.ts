import { Inject, Injectable, Logger } from '@nestjs/common';

import { AssetType } from '@domain/constants/asset-type.enum';
import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import { MarkerLifecycleState } from '@domain/entities/asset-context.entities';
import type {
  AssetSummary,
  MarkerEntity,
  MarkerResolutionResult,
  NodeContextResult,
  NodeEntity,
  RackEntity,
  RackTopologyResult,
} from '@domain/entities/asset-context.entities';
import {
  ASSET_QUERY_CACHE,
  MARKER_REPOSITORY,
  NODE_REPOSITORY,
  NODE_RUNTIME_SNAPSHOT_REPOSITORY,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  AssetQueryCachePort,
  MarkerRepositoryPort,
  NodeRepositoryPort,
  NodeRuntimeSnapshotRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import {
  BadRequestUseCaseError,
  ConflictUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';
import {
  buildAssetSummary,
  filterAssetSummaries,
  getMarkerTargetErrorCode,
} from '@use-cases/services/asset-context-read.helpers';

@Injectable()
export class AssetContextReadService {
  private readonly logger = new Logger(AssetContextReadService.name);

  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    @Inject(NODE_RUNTIME_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: NodeRuntimeSnapshotRepositoryPort,
    @Inject(ASSET_QUERY_CACHE)
    private readonly cache: AssetQueryCachePort,
  ) {}

  async getNodeContext(nodeId: string): Promise<NodeContextResult> {
    const cacheKey = `node-context:${nodeId}`;
    const cached = await this.cache.get<NodeContextResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const node = await this.getRequiredNode(nodeId);
    const rack = node.rackId
      ? ((await this.rackRepository.findById(node.rackId)) ?? undefined)
      : undefined;
    const runtimeSnapshot = await this.snapshotRepository.findByNodeId(node.id);
    const markers = await this.markerRepository.listByTarget(
      MarkerTargetType.NODE,
      node.id,
    );

    const context: NodeContextResult = {
      node,
      rack,
      runtimeSnapshot: runtimeSnapshot ?? undefined,
      markers,
      topologyPath: {
        rackId: rack?.id,
        rackCode: rack?.rackCode,
      },
      externalContext: {
        workloadSource: 'monitoring-service-or-bff',
      },
    };

    await this.cache.set(cacheKey, context, 60_000);
    return context;
  }

  async getRackTopology(rackId: string): Promise<RackTopologyResult> {
    const cacheKey = `rack-topology:${rackId}`;
    const cached = await this.cache.get<RackTopologyResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      this.logger.warn(`getRackTopology(${rackId}) could not find rack`);
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    const nodes = await this.nodeRepository.listByRackId(rackId);
    const snapshots = await Promise.all(
      nodes.map(async (node) => this.snapshotRepository.findByNodeId(node.id)),
    );

    const topology: RackTopologyResult = {
      rack,
      nodes,
      nodeRuntimeSnapshots: snapshots.filter(
        (snapshot): snapshot is NonNullable<typeof snapshot> =>
          Boolean(snapshot),
      ),
    };

    this.logger.log(
      `getRackTopology(${rackId}) loaded rack=${rack.rackCode} nodes=${nodes.length} snapshots=${topology.nodeRuntimeSnapshots.length}`,
    );
    await this.cache.set(cacheKey, topology, 60_000);
    return topology;
  }

  async getRackSummary(rackId: string): Promise<RackEntity> {
    const cacheKey = `rack-summary:${rackId}`;
    const cached = await this.cache.get<RackEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    const rack = await this.getRequiredRack(rackId);
    await this.cache.set(cacheKey, rack, 60_000);
    return rack;
  }

  async getRackSummaryByCode(rackCode: string): Promise<RackEntity> {
    const rack = await this.rackRepository.findByCode(rackCode);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackCode} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    await this.cache.set(`rack-summary:${rack.id}`, rack, 60_000);
    return rack;
  }

  async listRackSummaries(): Promise<RackEntity[]> {
    const racks = await this.rackRepository.listAll();
    return racks;
  }

  async batchGetRackSummaries(rackIds: string[]): Promise<RackEntity[]> {
    const uniqueRackIds = [...new Set(rackIds.filter(Boolean))];
    const summaries = await Promise.all(
      uniqueRackIds.map((rackId) => this.getRackSummary(rackId)),
    );

    return summaries;
  }

  async getTopologyTree(): Promise<RackTopologyResult[]> {
    const racks = await this.rackRepository.listAll();
    this.logger.log(`getTopologyTree() found ${racks.length} rack(s)`);
    const topology = await Promise.all(
      racks.map((rack) => this.getRackTopology(rack.id)),
    );
    this.logger.log(
      `getTopologyTree() returning ${topology.length} rack topology item(s)`,
    );
    return topology;
  }

  async resolveMarker(markerCode: string): Promise<MarkerResolutionResult> {
    const cacheKey = `marker-resolution:${markerCode}`;
    const cached = await this.cache.get<MarkerResolutionResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const marker = await this.markerRepository.findByCode(markerCode);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerCode} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (
      !marker.isActive ||
      marker.lifecycleState !== MarkerLifecycleState.ACTIVE
    ) {
      throw new BadRequestUseCaseError(
        `Marker ${markerCode} is not active.`,
        ErrorCode.ASSET_MARKER_NOT_ACTIVE,
      );
    }

    const target = await this.resolveMarkerTarget(marker);
    let rack: RackEntity | undefined;
    let node: NodeEntity | undefined;

    if (target.type === AssetType.RACK) {
      rack = await this.getRequiredRack(target.id);
    }

    if (target.type === AssetType.NODE) {
      const context = await this.getNodeContext(target.id);
      node = context.node;
      rack = context.rack;
    }

    const runtimeSnapshot = node
      ? ((await this.snapshotRepository.findByNodeId(node.id)) ?? undefined)
      : undefined;

    const resolution: MarkerResolutionResult = {
      marker,
      target,
      rack,
      node,
      runtimeSnapshot,
      topologyPath: {
        rackId: rack?.id,
        rackCode: rack?.rackCode,
      },
      externalContext: {
        workloadSource: 'monitoring-service-or-bff',
      },
    };

    await this.cache.set(cacheKey, resolution, 60_000);
    return resolution;
  }

  async findAssetByCode(code: string): Promise<AssetSummary | null> {
    const rack = await this.rackRepository.findByCode(code);
    if (rack) {
      return buildAssetSummary(
        rack.id,
        AssetType.RACK,
        rack.rackCode,
        rack.displayName,
        rack.lifecycleState,
      );
    }

    const node = await this.nodeRepository.findByCode(code);
    if (node) {
      return buildAssetSummary(
        node.id,
        AssetType.NODE,
        node.nodeCode,
        node.displayName,
        node.lifecycleState,
      );
    }

    const marker = await this.markerRepository.findByCode(code);
    if (marker) {
      return buildAssetSummary(
        marker.id,
        AssetType.MARKER,
        marker.markerCode,
        marker.displayLabel ?? marker.markerCode,
        marker.lifecycleState,
      );
    }

    return null;
  }

  async findAssetById(
    type: AssetType,
    assetId: string,
  ): Promise<AssetSummary | null> {
    switch (type) {
      case AssetType.RACK: {
        const rack = await this.rackRepository.findById(assetId);
        return rack
          ? buildAssetSummary(
              rack.id,
              AssetType.RACK,
              rack.rackCode,
              rack.displayName,
              rack.lifecycleState,
            )
          : null;
      }
      case AssetType.NODE: {
        const node = await this.nodeRepository.findById(assetId);
        return node
          ? buildAssetSummary(
              node.id,
              AssetType.NODE,
              node.nodeCode,
              node.displayName,
              node.lifecycleState,
            )
          : null;
      }
      default:
        return null;
    }
  }

  async searchAssets(
    query?: string,
    type?: AssetType,
  ): Promise<AssetSummary[]> {
    const results: AssetSummary[] = [];

    if (!type || type === AssetType.RACK) {
      const racks = await this.rackRepository.listAll();
      results.push(
        ...racks.map((rack) =>
          buildAssetSummary(
            rack.id,
            AssetType.RACK,
            rack.rackCode,
            rack.displayName,
            rack.lifecycleState,
          ),
        ),
      );
    }

    if (!type || type === AssetType.NODE) {
      const nodes = await this.nodeRepository.listAll();
      results.push(
        ...nodes.map((node) =>
          buildAssetSummary(
            node.id,
            AssetType.NODE,
            node.nodeCode,
            node.displayName,
            node.lifecycleState,
          ),
        ),
      );
    }

    if (!type || type === AssetType.MARKER) {
      const markers = await this.markerRepository.listAll();
      results.push(
        ...markers.map((marker) =>
          buildAssetSummary(
            marker.id,
            AssetType.MARKER,
            marker.markerCode,
            marker.displayLabel ?? marker.markerCode,
            marker.lifecycleState,
          ),
        ),
      );
    }

    return filterAssetSummaries(results, query);
  }

  async validateMarkerTarget(
    targetType: MarkerTargetType,
    targetId: string,
  ): Promise<void> {
    const target = await this.findMarkerTarget(targetType, targetId);
    if (!target) {
      throw new NotFoundUseCaseError(
        `Marker target ${targetType}:${targetId} was not found.`,
        getMarkerTargetErrorCode(targetType),
      );
    }
  }

  async ensureCodeAvailable(
    code: string,
    ignore?: { type: AssetType; id: string },
  ): Promise<void> {
    const asset = await this.findAssetByCode(code);
    if (!asset) {
      return;
    }

    if (ignore && ignore.type === asset.type && ignore.id === asset.id) {
      return;
    }

    throw new ConflictUseCaseError(`Asset code ${code} is already in use.`);
  }

  async invalidateNodeContext(
    nodeId: string,
    markerCode?: string,
  ): Promise<void> {
    await this.cache.del(`node-context:${nodeId}`);
    if (markerCode) {
      await this.cache.del(`marker-resolution:${markerCode}`);
    }
  }

  async invalidateRackTopology(rackId: string): Promise<void> {
    await this.cache.del(`rack-topology:${rackId}`);
    await this.cache.del(`rack-summary:${rackId}`);
  }

  async invalidateRackSummary(rackId: string): Promise<void> {
    await this.cache.del(`rack-summary:${rackId}`);
  }

  async invalidateMarkerResolution(markerCode: string): Promise<void> {
    await this.cache.del(`marker-resolution:${markerCode}`);
  }

  private async resolveMarkerTarget(
    marker: MarkerEntity,
  ): Promise<AssetSummary> {
    if (!marker.targetType || !marker.targetId) {
      throw new NotFoundUseCaseError(
        `Marker ${marker.markerCode} is not mapped to any asset.`,
        ErrorCode.ASSET_MARKER_TARGET_INVALID,
      );
    }

    const target = await this.findMarkerTarget(
      marker.targetType,
      marker.targetId,
    );
    if (!target) {
      throw new NotFoundUseCaseError(
        `Marker target ${marker.targetType}:${marker.targetId} was not found.`,
        getMarkerTargetErrorCode(marker.targetType),
      );
    }

    return target;
  }

  private async findMarkerTarget(
    targetType: MarkerTargetType,
    targetId: string,
  ): Promise<AssetSummary | null> {
    switch (targetType) {
      case MarkerTargetType.RACK: {
        const rack = await this.rackRepository.findById(targetId);
        return rack
          ? buildAssetSummary(
              rack.id,
              AssetType.RACK,
              rack.rackCode,
              rack.displayName,
              rack.lifecycleState,
            )
          : null;
      }
      case MarkerTargetType.NODE: {
        const node = await this.nodeRepository.findById(targetId);
        return node
          ? buildAssetSummary(
              node.id,
              AssetType.NODE,
              node.nodeCode,
              node.displayName,
              node.lifecycleState,
            )
          : null;
      }
      default:
        return null;
    }
  }

  private async getRequiredRack(rackId: string): Promise<RackEntity> {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }

  private async getRequiredNode(nodeId: string): Promise<NodeEntity> {
    const node = await this.nodeRepository.findById(nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    return node;
  }
}
