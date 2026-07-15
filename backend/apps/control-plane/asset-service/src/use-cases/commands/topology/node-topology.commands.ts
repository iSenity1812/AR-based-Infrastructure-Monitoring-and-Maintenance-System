import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import { AssetType } from '@domain/constants/asset-type.enum';
import {
  NodeAssignmentState,
  NodeLifecycleState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import {
  DISCOVERED_NODE_REPOSITORY,
  NODE_MAPPING_EVENT_PUBLISHER,
  NODE_REPOSITORY,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import type { NodeMappingEventPublisherPort } from '@domain/ports/node-mapping-event.publisher.port';
import type {
  DiscoveredNodeRepositoryPort,
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import {
  BadRequestUseCaseError,
  ConflictUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

function isMongoDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message } = error as {
    code?: unknown;
    message?: unknown;
  };

  return (
    code === 11000 ||
    (typeof message === 'string' &&
      message.includes('E11000 duplicate key error'))
  );
}

async function publishNodeMappingBestEffort(
  publisher: NodeMappingEventPublisherPort | undefined,
  nodeCode: string,
  rackId: string | null,
  context: string,
) {
  if (!publisher) {
    return;
  }

  try {
    await publisher.publishNodeMapping(nodeCode, rackId);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown publish failure';
    Logger.warn(
      `${context} mapping publish failed for node ${nodeCode}: ${reason}`,
      'AssetTopology',
    );
  }
}

@Injectable()
export class NormalizeNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
    @Inject(NODE_MAPPING_EVENT_PUBLISHER)
    @Optional()
    private readonly nodeMappingEventPublisher?: NodeMappingEventPublisherPort,
  ) {}

  async execute(
    input: {
      nodeCode: string;
      displayName: string;
      hostname?: string;
      nodeType?: string;
      source: string;
      serialNumber?: string;
      vendor?: string;
      model?: string;
      managementIp?: string;
      positionCode?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
    options?: { publishNodeMapping?: boolean },
  ) {
    const shouldPublishNodeMapping = options?.publishNodeMapping ?? true;
    const existing = await this.nodeRepository.findByCode(input.nodeCode);
    if (existing) {
      try {
        const updated = await this.nodeRepository.update(existing.id, {
          displayName: input.displayName,
          hostname: input.hostname,
          nodeType: input.nodeType,
          source: input.source,
          serialNumber: input.serialNumber,
          vendor: input.vendor,
          model: input.model,
          managementIp: input.managementIp,
          positionCode: input.positionCode,
          notes: input.notes,
          metadata: input.metadata ?? existing.metadata,
          lifecycleState:
            existing.lifecycleState === NodeLifecycleState.RETIRED
              ? NodeLifecycleState.RETIRED
              : NodeLifecycleState.READY,
        });

        return updated;
      } catch (error) {
        if (isMongoDuplicateKeyError(error)) {
          throw new ConflictUseCaseError(
            `Node ${input.nodeCode} conflicts with an existing asset position or code.`,
          );
        }

        throw error;
      }
    }

    await this.assetContextReadService.ensureCodeAvailable(input.nodeCode);
    const created = await this.nodeRepository.create({
      ...input,
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      metadata: input.metadata ?? {},
    });
    if (shouldPublishNodeMapping) {
      await publishNodeMappingBestEffort(
        this.nodeMappingEventPublisher,
        created.nodeCode,
        created.rackId ?? null,
        'normalize node',
      );
    }
    return created;
  }
}

@Injectable()
export class UpdateNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
    @Inject(NODE_MAPPING_EVENT_PUBLISHER)
    @Optional()
    private readonly nodeMappingEventPublisher?: NodeMappingEventPublisherPort,
  ) {}

  async execute(
    nodeId: string,
    input: {
      nodeCode?: string;
      displayName?: string;
      hostname?: string;
      rackId?: string | null;
      nodeType?: string;
      source?: string;
      serialNumber?: string;
      vendor?: string;
      model?: string;
      managementIp?: string;
      positionCode?: string | null;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const node = await this.getRequiredNode(nodeId);
    const resolvedNodeId = node.id;
    const placementUpdateRequested =
      Object.prototype.hasOwnProperty.call(input, 'rackId') ||
      Object.prototype.hasOwnProperty.call(input, 'positionCode');
    const nextRackId = Object.prototype.hasOwnProperty.call(input, 'rackId')
      ? input.rackId
      : node.rackId;
    const nextPositionCode = Object.prototype.hasOwnProperty.call(
      input,
      'positionCode',
    )
      ? input.positionCode
      : node.positionCode;

    if (input.nodeCode) {
      await this.assetContextReadService.ensureCodeAvailable(input.nodeCode, {
        type: AssetType.NODE,
        id: resolvedNodeId,
      });
    }

    if (
      (nextRackId && !nextPositionCode) ||
      (!nextRackId && nextPositionCode)
    ) {
      throw new BadRequestUseCaseError(
        'rackId and positionCode must be updated together to keep node placement consistent.',
      );
    }

    if (nextRackId && nextPositionCode) {
      const rack = await this.getRequiredRack(nextRackId);
      if (rack.lifecycleState === RackLifecycleState.RETIRED) {
        throw new BadRequestUseCaseError(
          'Cannot assign nodes to retired racks.',
        );
      }
      if (rack.lifecycleState === RackLifecycleState.DRAINING) {
        throw new BadRequestUseCaseError(
          'Cannot assign nodes to a draining rack without explicit override.',
        );
      }
      this.ensurePositionWithinRackCapacity(
        rack.capacityLimit,
        nextPositionCode,
      );
    }

    await this.ensurePositionAvailability(
      resolvedNodeId,
      nextRackId,
      nextPositionCode,
    );

    const updatePayload: Parameters<NodeRepositoryPort['update']>[1] = {
      ...input,
    };
    if (placementUpdateRequested) {
      updatePayload.assignmentState = this.resolveAssignmentState(
        node,
        nextRackId,
        nextPositionCode,
      );
    }

    let updated: Awaited<ReturnType<NodeRepositoryPort['update']>>;
    try {
      updated = await this.nodeRepository.update(resolvedNodeId, updatePayload);
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictUseCaseError(
          nextRackId && nextPositionCode
            ? `Rack ${nextRackId} already has a node at position ${nextPositionCode}.`
            : 'Node update conflicts with an existing asset.',
        );
      }

      throw error;
    }

    await this.assetContextReadService.invalidateNodeContext(resolvedNodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    if (updated?.rackId && updated.rackId !== node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(updated.rackId);
    }

    if (placementUpdateRequested) {
      await this.syncDiscoveredNodePlacement(updated ?? node, node.nodeCode);
    }

    if ((updated?.rackId ?? null) !== (node.rackId ?? null)) {
      await publishNodeMappingBestEffort(
        this.nodeMappingEventPublisher,
        node.nodeCode,
        updated?.rackId ?? null,
        'update node',
      );
    }
    return updated;
  }

  private resolveAssignmentState(
    node: {
      rackId?: string | null;
      positionCode?: string | null;
      assignmentState: NodeAssignmentState;
    },
    rackId: string | null | undefined,
    positionCode: string | null | undefined,
  ) {
    if (!rackId || !positionCode) {
      return NodeAssignmentState.UNASSIGNED;
    }

    if (!node.rackId || !node.positionCode) {
      return NodeAssignmentState.ASSIGNED;
    }

    if (node.rackId !== rackId || node.positionCode !== positionCode) {
      return NodeAssignmentState.MOVED;
    }

    return node.assignmentState;
  }

  private async syncDiscoveredNodePlacement(
    node: {
      rackId?: string | null;
      assignmentState: NodeAssignmentState;
    },
    nodeCode: string,
  ) {
    const discoveredNode =
      await this.discoveredNodeRepository.findByAgentId(nodeCode);
    if (!discoveredNode) {
      return;
    }

    const rack = node.rackId
      ? await this.rackRepository.findById(node.rackId)
      : null;

    await this.discoveredNodeRepository.save({
      ...discoveredNode,
      assignmentState: node.assignmentState,
      logicalRackId: node.rackId ?? null,
      siteCode: rack?.siteCode,
      updatedAt: new Date().toISOString(),
    });
  }

  private async getRequiredNode(nodeId: string) {
    const node = await findNodeByIdentifier(this.nodeRepository, nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    return node;
  }

  private async ensurePositionAvailability(
    nodeId: string,
    rackId: string | null | undefined,
    positionCode: string | null | undefined,
  ) {
    if (!rackId || !positionCode) {
      return;
    }

    const occupyingNode = await this.nodeRepository.findByRackIdAndPositionCode(
      rackId,
      positionCode,
    );

    if (occupyingNode && occupyingNode.id !== nodeId) {
      throw new ConflictUseCaseError(
        `Rack ${rackId} already has a node at position ${positionCode}.`,
      );
    }
  }

  private async getRequiredRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }

  private ensurePositionWithinRackCapacity(
    capacityLimit: number | undefined,
    positionCode: string,
  ) {
    if (!capacityLimit) {
      return;
    }

    const normalizedPosition = this.parseRackUnitPosition(positionCode);
    if (normalizedPosition === null) {
      return;
    }

    if (normalizedPosition > capacityLimit) {
      throw new BadRequestUseCaseError(
        `Rack supports up to U${capacityLimit}, but received ${positionCode}.`,
      );
    }
  }

  private parseRackUnitPosition(positionCode: string | undefined) {
    if (!positionCode) {
      return null;
    }

    const match = positionCode.trim().match(/^U\s*(\d+)$/i);
    if (!match) {
      return null;
    }

    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
  }
}

@Injectable()
export class AssignNodeToRackUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
    @Inject(NODE_MAPPING_EVENT_PUBLISHER)
    @Optional()
    private readonly nodeMappingEventPublisher?: NodeMappingEventPublisherPort,
  ) {}

  async execute(
    nodeId: string,
    rackId: string,
    positionCode: string,
    allowDraining = false,
  ) {
    const node = await this.getRequiredNode(nodeId);
    const resolvedNodeId = node.id;
    const rack = await this.getRequiredRack(rackId);

    // if (node.lifecycleState === NodeLifecycleState.RETIRED) {
    //   throw new BadRequestUseCaseError(
    //     'Retired nodes cannot be assigned to racks.',
    //   );
    // }

    if (rack.lifecycleState === RackLifecycleState.RETIRED) {
      throw new BadRequestUseCaseError('Cannot assign nodes to retired racks.');
    }

    if (rack.lifecycleState === RackLifecycleState.DRAINING && !allowDraining) {
      throw new BadRequestUseCaseError(
        'Cannot assign nodes to a draining rack without explicit override.',
      );
    }

    this.ensurePositionWithinRackCapacity(rack.capacityLimit, positionCode);

    if (node.rackId === rackId && node.positionCode === positionCode) {
      throw new BadRequestUseCaseError(
        `Node ${nodeId} is already assigned to rack ${rackId} at position ${positionCode}.`,
        ErrorCode.ASSET_NODE_ALREADY_ASSIGNED,
      );
    }

    await this.ensurePositionAvailability(resolvedNodeId, rackId, positionCode);

    const assignmentState = node.rackId
      ? NodeAssignmentState.MOVED
      : NodeAssignmentState.ASSIGNED;

    let updated: Awaited<ReturnType<NodeRepositoryPort['update']>>;
    try {
      updated = await this.nodeRepository.update(resolvedNodeId, {
        rackId,
        positionCode,
        assignmentState,
        lifecycleState:
          node.lifecycleState === NodeLifecycleState.DISCOVERED
            ? NodeLifecycleState.READY
            : node.lifecycleState,
      });
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictUseCaseError(
          `Rack ${rackId} already has a node at position ${positionCode}.`,
        );
      }

      throw error;
    }

    await this.assetContextReadService.invalidateNodeContext(resolvedNodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    await this.assetContextReadService.invalidateRackTopology(rackId);
    await publishNodeMappingBestEffort(
      this.nodeMappingEventPublisher,
      node.nodeCode,
      updated?.rackId ?? rackId,
      'assign node',
    );
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
    const node = await findNodeByIdentifier(this.nodeRepository, nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    return node;
  }

  private async getRequiredRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }

  private async ensurePositionAvailability(
    nodeId: string,
    rackId: string | undefined,
    positionCode: string | undefined,
  ) {
    if (!rackId || !positionCode) {
      return;
    }

    const occupyingNode = await this.nodeRepository.findByRackIdAndPositionCode(
      rackId,
      positionCode,
    );

    if (occupyingNode && occupyingNode.id !== nodeId) {
      throw new ConflictUseCaseError(
        `Rack ${rackId} already has a node at position ${positionCode}.`,
      );
    }
  }

  private ensurePositionWithinRackCapacity(
    capacityLimit: number | undefined,
    positionCode: string,
  ) {
    if (!capacityLimit) {
      return;
    }

    const normalizedPosition = this.parseRackUnitPosition(positionCode);
    if (normalizedPosition === null) {
      return;
    }

    if (normalizedPosition > capacityLimit) {
      throw new BadRequestUseCaseError(
        `Rack supports up to U${capacityLimit}, but received ${positionCode}.`,
      );
    }
  }

  private parseRackUnitPosition(positionCode: string | undefined) {
    if (!positionCode) {
      return null;
    }

    const match = positionCode.trim().match(/^U\s*(\d+)$/i);
    if (!match) {
      return null;
    }

    const value = Number.parseInt(match[1], 10);
    return Number.isNaN(value) ? null : value;
  }
}

@Injectable()
export class ActivateNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
  ) {}

  async execute(nodeId: string) {
    const node = await this.requireAssignedNode(nodeId);
    const resolvedNodeId = node.id;
    const updated = await this.nodeRepository.update(resolvedNodeId, {
      lifecycleState: NodeLifecycleState.ACTIVE,
    });

    const discoveredNode = await this.discoveredNodeRepository.findByAgentId(
      node.nodeCode,
    );
    if (discoveredNode) {
      const rack = node.rackId
        ? await this.rackRepository.findById(node.rackId)
        : null;
      await this.discoveredNodeRepository.save({
        ...discoveredNode,
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: node.assignmentState,
        logicalRackId: node.rackId ?? null,
        siteCode: rack?.siteCode,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.assetContextReadService.invalidateNodeContext(resolvedNodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async requireAssignedNode(nodeId: string) {
    const node = await findNodeByIdentifier(this.nodeRepository, nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }
    if (
      !node.rackId ||
      node.assignmentState === NodeAssignmentState.UNASSIGNED
    ) {
      throw new BadRequestUseCaseError(
        'Node must be assigned to a rack before activation.',
      );
    }
    return node;
  }
}

@Injectable()
export class DrainNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(nodeId: string) {
    const node = await this.getRequiredNode(nodeId);
    const resolvedNodeId = node.id;
    if (node.lifecycleState !== NodeLifecycleState.ACTIVE) {
      throw new BadRequestUseCaseError(
        'Only active nodes can enter draining state.',
      );
    }

    const updated = await this.nodeRepository.update(resolvedNodeId, {
      lifecycleState: NodeLifecycleState.DRAINING,
    });
    await this.assetContextReadService.invalidateNodeContext(resolvedNodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
    const node = await findNodeByIdentifier(this.nodeRepository, nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }
    return node;
  }
}

@Injectable()
export class RetireNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
    @Inject(NODE_MAPPING_EVENT_PUBLISHER)
    @Optional()
    private readonly nodeMappingEventPublisher?: NodeMappingEventPublisherPort,
  ) {}

  async execute(nodeId: string) {
    const node = await this.getRequiredNode(nodeId);
    const resolvedNodeId = node.id;
    const updated = await this.nodeRepository.update(resolvedNodeId, {
      lifecycleState: NodeLifecycleState.RETIRED,
      assignmentState: node.rackId
        ? NodeAssignmentState.ASSIGNED
        : NodeAssignmentState.UNASSIGNED,
    });

    const discoveredNode = await this.discoveredNodeRepository.findByAgentId(
      node.nodeCode,
    );
    if (discoveredNode) {
      await this.discoveredNodeRepository.save({
        ...discoveredNode,
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: node.rackId
          ? NodeAssignmentState.ASSIGNED
          : NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        siteCode: undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    await this.assetContextReadService.invalidateNodeContext(resolvedNodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
    const node = await findNodeByIdentifier(this.nodeRepository, nodeId);
    if (!node) {
      throw new NotFoundUseCaseError(
        `Node ${nodeId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }
    return node;
  }
}

async function findNodeByIdentifier(
  nodeRepository: NodeRepositoryPort,
  nodeIdentifier: string,
) {
  try {
    const nodeById = await nodeRepository.findById(nodeIdentifier);
    if (nodeById) {
      return nodeById;
    }
  } catch (error) {
    if (isValidObjectId(nodeIdentifier)) {
      throw error;
    }
  }

  return nodeRepository.findByCode(nodeIdentifier);
}
