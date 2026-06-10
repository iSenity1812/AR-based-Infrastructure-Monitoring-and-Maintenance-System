import { Inject, Injectable } from '@nestjs/common';

import { AssetType } from '@domain/constants/asset-type.enum';
import {
  NodeAssignmentState,
  NodeLifecycleState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import { NODE_REPOSITORY, RACK_REPOSITORY } from '@domain/ports/port.tokens';
import type {
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import {
  BadRequestUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

@Injectable()
export class NormalizeNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(input: {
    nodeCode: string;
    displayName: string;
    hostname?: string;
    nodeType?: string;
    source: string;
    serialNumber?: string;
    vendor?: string;
    model?: string;
    managementIp?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await this.nodeRepository.findByCode(input.nodeCode);
    if (existing) {
      const updated = await this.nodeRepository.update(existing.id, {
        displayName: input.displayName,
        hostname: input.hostname,
        nodeType: input.nodeType,
        source: input.source,
        serialNumber: input.serialNumber,
        vendor: input.vendor,
        model: input.model,
        managementIp: input.managementIp,
        notes: input.notes,
        metadata: input.metadata ?? existing.metadata,
        lifecycleState:
          existing.lifecycleState === NodeLifecycleState.RETIRED
            ? NodeLifecycleState.RETIRED
            : NodeLifecycleState.READY,
      });

      return updated;
    }

    await this.assetContextReadService.ensureCodeAvailable(input.nodeCode);
    return this.nodeRepository.create({
      ...input,
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      metadata: input.metadata ?? {},
    });
  }
}

@Injectable()
export class UpdateNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(
    nodeId: string,
    input: {
      nodeCode?: string;
      displayName?: string;
      hostname?: string;
      nodeType?: string;
      source?: string;
      serialNumber?: string;
      vendor?: string;
      model?: string;
      managementIp?: string;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const node = await this.getRequiredNode(nodeId);
    if (input.nodeCode) {
      await this.assetContextReadService.ensureCodeAvailable(input.nodeCode, {
        type: AssetType.NODE,
        id: nodeId,
      });
    }

    const updated = await this.nodeRepository.update(nodeId, input);
    await this.assetContextReadService.invalidateNodeContext(nodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    if (updated?.rackId && updated.rackId !== node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(updated.rackId);
    }
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
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

@Injectable()
export class AssignNodeToRackUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(nodeId: string, rackId: string, allowDraining = false) {
    const node = await this.getRequiredNode(nodeId);
    const rack = await this.getRequiredRack(rackId);

    if (node.lifecycleState === NodeLifecycleState.RETIRED) {
      throw new BadRequestUseCaseError(
        'Retired nodes cannot be assigned to racks.',
      );
    }

    if (rack.lifecycleState === RackLifecycleState.RETIRED) {
      throw new BadRequestUseCaseError('Cannot assign nodes to retired racks.');
    }

    if (rack.lifecycleState === RackLifecycleState.DRAINING && !allowDraining) {
      throw new BadRequestUseCaseError(
        'Cannot assign nodes to a draining rack without explicit override.',
      );
    }

    if (node.rackId === rackId) {
      throw new BadRequestUseCaseError(
        `Node ${nodeId} is already assigned to rack ${rackId}.`,
        ErrorCode.ASSET_NODE_ALREADY_ASSIGNED,
      );
    }

    const assignmentState = node.rackId
      ? NodeAssignmentState.MOVED
      : NodeAssignmentState.ASSIGNED;

    const updated = await this.nodeRepository.update(nodeId, {
      rackId,
      assignmentState,
      lifecycleState:
        node.lifecycleState === NodeLifecycleState.DISCOVERED
          ? NodeLifecycleState.READY
          : node.lifecycleState,
    });

    await this.assetContextReadService.invalidateNodeContext(nodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
    const node = await this.nodeRepository.findById(nodeId);
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
}

@Injectable()
export class ActivateNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(nodeId: string) {
    const node = await this.requireAssignedNode(nodeId);
    const updated = await this.nodeRepository.update(nodeId, {
      lifecycleState: NodeLifecycleState.ACTIVE,
    });
    await this.assetContextReadService.invalidateNodeContext(nodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async requireAssignedNode(nodeId: string) {
    const node = await this.nodeRepository.findById(nodeId);
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
    if (node.lifecycleState !== NodeLifecycleState.ACTIVE) {
      throw new BadRequestUseCaseError(
        'Only active nodes can enter draining state.',
      );
    }

    const updated = await this.nodeRepository.update(nodeId, {
      lifecycleState: NodeLifecycleState.DRAINING,
    });
    await this.assetContextReadService.invalidateNodeContext(nodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
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

@Injectable()
export class RetireNodeUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(nodeId: string) {
    const node = await this.getRequiredNode(nodeId);
    const updated = await this.nodeRepository.update(nodeId, {
      lifecycleState: NodeLifecycleState.RETIRED,
      rackId: undefined,
      assignmentState: NodeAssignmentState.UNASSIGNED,
    });
    await this.assetContextReadService.invalidateNodeContext(nodeId);
    if (node.rackId) {
      await this.assetContextReadService.invalidateRackTopology(node.rackId);
    }
    return updated;
  }

  private async getRequiredNode(nodeId: string) {
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
