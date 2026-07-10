import { Inject, Injectable } from '@nestjs/common';

import { NodeAssignmentState } from '@domain/entities/asset-context.entities';
import type {
  DiscoveredNodeEntity,
  NodeEntity,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import {
  DISCOVERED_NODE_REPOSITORY,
  NODE_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  DiscoveredNodeRepositoryPort,
  NodeRepositoryPort,
} from '@domain/ports/repositories.port';

export type PendingAssignmentNodeOrigin = 'mongo' | 'redis' | 'merged';

export interface PendingAssignmentNodeListItem {
  nodeId?: string;
  nodeCode: string;
  displayName: string;
  hostname?: string;
  nodeType?: string;
  source: string;
  lifecycleState: NodeLifecycleState;
  assignmentState: NodeAssignmentState;
  rackId?: string | null;
  positionCode?: string | null;
  logicalRackId?: string | null;
  siteCode?: string;
  origin: PendingAssignmentNodeOrigin;
  discoveredNode?: DiscoveredNodeEntity;
}

function toRedisOnlyItem(
  discoveredNode: DiscoveredNodeEntity,
): PendingAssignmentNodeListItem {
  return {
    nodeCode: discoveredNode.agentId,
    displayName: discoveredNode.hostname || discoveredNode.agentId,
    hostname: discoveredNode.hostname,
    nodeType: discoveredNode.deviceType,
    source: discoveredNode.source ?? 'unknown',
    lifecycleState: discoveredNode.lifecycleState,
    assignmentState: discoveredNode.assignmentState,
    logicalRackId: discoveredNode.logicalRackId,
    siteCode: discoveredNode.siteCode,
    origin: 'redis',
    discoveredNode,
  };
}

function isPendingAssignmentState(assignmentState: NodeAssignmentState) {
  return assignmentState === NodeAssignmentState.UNASSIGNED;
}

function mergeCanonicalAndDiscovered(
  node: NodeEntity,
  discoveredNode: DiscoveredNodeEntity,
): PendingAssignmentNodeListItem {
  return {
    nodeId: node.id,
    nodeCode: node.nodeCode,
    displayName: node.displayName,
    hostname: node.hostname ?? discoveredNode.hostname,
    nodeType: node.nodeType ?? discoveredNode.deviceType,
    source: node.source,
    lifecycleState: node.lifecycleState,
    assignmentState: node.assignmentState,
    rackId: node.rackId,
    positionCode: node.positionCode,
    logicalRackId: discoveredNode.logicalRackId,
    siteCode: discoveredNode.siteCode,
    origin: 'merged',
    discoveredNode,
  };
}

function toMongoOnlyItem(node: NodeEntity): PendingAssignmentNodeListItem {
  return {
    nodeId: node.id,
    nodeCode: node.nodeCode,
    displayName: node.displayName,
    hostname: node.hostname,
    nodeType: node.nodeType,
    source: node.source,
    lifecycleState: node.lifecycleState,
    assignmentState: node.assignmentState,
    rackId: node.rackId,
    positionCode: node.positionCode,
    origin: 'mongo',
  };
}

@Injectable()
export class ListPendingAssignmentNodesUseCase {
  constructor(
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(DISCOVERED_NODE_REPOSITORY)
    private readonly discoveredNodeRepository: DiscoveredNodeRepositoryPort,
  ) {}

  async execute(): Promise<PendingAssignmentNodeListItem[]> {
    const [unassignedNodes, discoveredNodes] = await Promise.all([
      this.nodeRepository.listUnassigned(),
      this.discoveredNodeRepository.listAll(),
    ]);

    const pendingUnassignedNodes = unassignedNodes.filter((node) =>
      isPendingAssignmentState(node.assignmentState),
    );
    const pendingDiscoveredNodes = discoveredNodes.filter((discoveredNode) =>
      isPendingAssignmentState(discoveredNode.assignmentState),
    );

    const discoveredNodeMap = new Map(
      pendingDiscoveredNodes.map((discoveredNode) => [
        discoveredNode.agentId,
        discoveredNode,
      ]),
    );

    const mergedNodes = pendingUnassignedNodes.map((node) => {
      const discoveredNode = discoveredNodeMap.get(node.nodeCode);
      if (!discoveredNode) {
        return toMongoOnlyItem(node);
      }

      discoveredNodeMap.delete(node.nodeCode);
      return mergeCanonicalAndDiscovered(node, discoveredNode);
    });

    const redisOnlyNodes = [...discoveredNodeMap.values()].map(toRedisOnlyItem);

    return [...mergedNodes, ...redisOnlyNodes];
  }
}
