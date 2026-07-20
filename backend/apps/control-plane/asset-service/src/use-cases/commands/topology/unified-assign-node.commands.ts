import { Inject, Injectable, Logger } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

import {
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import {
  DISCOVERED_NODE_REPOSITORY,
  NODE_REPOSITORY,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  DiscoveredNodeRepositoryPort,
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import { NotFoundUseCaseError } from '@use-cases/errors/use-case.errors';

import { AssignDiscoveredNodeToRackUseCase } from './discovered-node.commands';
import {
  ActivateNodeUseCase,
  AssignNodeToRackUseCase,
} from './node-topology.commands';

@Injectable()
export class UnifiedAssignNodeToRackUseCase {
  private readonly logger = new Logger(UnifiedAssignNodeToRackUseCase.name);

  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assignNodeToRackUseCase: AssignNodeToRackUseCase,
    private readonly activateNodeUseCase: ActivateNodeUseCase,
    private readonly assignDiscoveredNodeToRackUseCase: AssignDiscoveredNodeToRackUseCase,
  ) {}

  async execute(input: {
    nodeId: string;
    rackId: string;
    positionCode: string;
    allowDraining?: boolean;
  }) {
    const node = await this.findNodeByIdentifier(input.nodeId);
    if (!node) {
      return this.assignDiscoveredNodeToRackUseCase.execute(
        input.nodeId,
        input.rackId,
        input.positionCode,
        input.allowDraining,
      );
    }

    const assignedNode = await this.assignNodeToRackUseCase.execute(
      node.id,
      input.rackId,
      input.positionCode,
      input.allowDraining,
    );

    if (!assignedNode) {
      throw new NotFoundUseCaseError(
        `Node ${input.nodeId} was not found after assignment.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    const activeNode =
      assignedNode.lifecycleState === NodeLifecycleState.ACTIVE
        ? assignedNode
        : await this.activateNodeUseCase.execute(assignedNode.id);
    if (!activeNode) {
      throw new NotFoundUseCaseError(
        `Node ${input.nodeId} was not found after activation.`,
        ErrorCode.ASSET_NODE_NOT_FOUND,
      );
    }

    const rack = await this.rackRepository.findById(input.rackId);
    const existingDiscoveredNode =
      await this.discoveredNodeRepository.findByAgentId(node.nodeCode);
    const timestamp = new Date().toISOString();

    const discoveredNode = existingDiscoveredNode
      ? {
          ...existingDiscoveredNode,
          hostname:
            activeNode.hostname ??
            existingDiscoveredNode.hostname ??
            activeNode.displayName,
          deviceType: activeNode.nodeType ?? existingDiscoveredNode.deviceType,
          source: activeNode.source ?? existingDiscoveredNode.source,
          lifecycleState: activeNode.lifecycleState,
          assignmentState: NodeAssignmentState.ASSIGNED,
          logicalRackId: input.rackId,
          siteCode: rack?.siteCode,
          hardware: {
            ...existingDiscoveredNode.hardware,
            primaryIpv4:
              activeNode.managementIp ??
              existingDiscoveredNode.hardware.primaryIpv4,
            hardwareSerial:
              activeNode.serialNumber ??
              existingDiscoveredNode.hardware.hardwareSerial,
            vendor: activeNode.vendor ?? existingDiscoveredNode.hardware.vendor,
            model: activeNode.model ?? existingDiscoveredNode.hardware.model,
          },
          updatedAt: timestamp,
        }
      : {
          agentId: activeNode.nodeCode,
          hostname: activeNode.hostname ?? activeNode.displayName,
          deviceType: activeNode.nodeType ?? 'UNKNOWN',
          source: activeNode.source,
          lifecycleState: activeNode.lifecycleState ?? NodeLifecycleState.READY,
          assignmentState: NodeAssignmentState.ASSIGNED,
          logicalRackId: input.rackId,
          siteCode: rack?.siteCode,
          hardware: {
            primaryIpv4: activeNode.managementIp,
            hardwareSerial: activeNode.serialNumber,
            vendor: activeNode.vendor,
            model: activeNode.model,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    await this.discoveredNodeRepository.save(discoveredNode);
    this.logger.log(
      `Synced discovered node state for ${activeNode.nodeCode} to rack ${input.rackId}`,
    );

    return {
      node: activeNode,
      discoveredNode,
    };
  }

  private async findNodeByIdentifier(nodeIdentifier: string) {
    try {
      const nodeById = await this.nodeRepository.findById(nodeIdentifier);
      if (nodeById) {
        return nodeById;
      }
    } catch (error) {
      if (isValidObjectId(nodeIdentifier)) {
        throw error;
      }
    }

    return this.nodeRepository.findByCode(nodeIdentifier);
  }
}
