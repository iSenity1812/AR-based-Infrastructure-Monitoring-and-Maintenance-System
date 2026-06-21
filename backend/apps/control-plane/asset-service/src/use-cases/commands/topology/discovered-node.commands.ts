import { Inject, Injectable } from '@nestjs/common';

import {
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import {
  DISCOVERED_NODE_REPOSITORY,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  DiscoveredNodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import { NotFoundUseCaseError } from '@use-cases/errors/use-case.errors';

import {
  ActivateNodeUseCase,
  AssignNodeToRackUseCase,
  NormalizeNodeUseCase,
} from './node-topology.commands';

@Injectable()
export class AssignDiscoveredNodeToRackUseCase {
  constructor(
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly normalizeNodeUseCase: NormalizeNodeUseCase,
    private readonly assignNodeToRackUseCase: AssignNodeToRackUseCase,
    private readonly activateNodeUseCase: ActivateNodeUseCase,
  ) {}

  async execute(
    agentId: string,
    rackId: string,
    positionCode: string,
    allowDraining = false,
  ) {
    const discoveredNode =
      await this.discoveredNodeRepository.findByAgentId(agentId);
    if (!discoveredNode) {
      throw new NotFoundUseCaseError(
        `Discovered node ${agentId} was not found.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    const normalizedNode = await this.normalizeNodeUseCase.execute({
      nodeCode: discoveredNode.agentId,
      displayName: discoveredNode.hostname || discoveredNode.agentId,
      hostname: discoveredNode.hostname,
      nodeType: discoveredNode.deviceType,
      source: discoveredNode.source ?? 'unknown',
      serialNumber: discoveredNode.hardware.hardwareSerial,
      vendor: discoveredNode.hardware.vendor,
      model: discoveredNode.hardware.model,
      managementIp: discoveredNode.hardware.primaryIpv4,
      notes: `Node discovered through ${discoveredNode.source ?? 'unknown'} registration.`,
      metadata: {
        discoveredNode: {
          agentId: discoveredNode.agentId,
          source: discoveredNode.source,
          hardware: discoveredNode.hardware,
          registeredAt: discoveredNode.createdAt,
        },
      },
    });
    if (!normalizedNode) {
      throw new NotFoundUseCaseError(
        `Discovered node ${agentId} could not be normalized.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    await this.assignNodeToRackUseCase.execute(
      normalizedNode.id,
      rackId,
      positionCode,
      allowDraining,
    );
    const activeNode = await this.activateNodeUseCase.execute(
      normalizedNode.id,
    );
    const rack = await this.rackRepository.findById(rackId);

    const updatedDiscoveredNode = {
      ...discoveredNode,
      lifecycleState: NodeLifecycleState.ACTIVE,
      assignmentState: NodeAssignmentState.ASSIGNED,
      logicalRackId: rackId,
      siteCode: rack?.siteCode,
      updatedAt: new Date().toISOString(),
    };

    await this.discoveredNodeRepository.save(updatedDiscoveredNode);

    return {
      node: activeNode,
      discoveredNode: updatedDiscoveredNode,
    };
  }
}
