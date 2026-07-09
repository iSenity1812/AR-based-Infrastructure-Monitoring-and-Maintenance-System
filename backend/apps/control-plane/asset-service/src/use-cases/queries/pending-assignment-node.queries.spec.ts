import {
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import type {
  DiscoveredNodeRepositoryPort,
  NodeRepositoryPort,
} from '@domain/ports/repositories.port';

import { ListPendingAssignmentNodesUseCase } from './pending-assignment-node.queries';

function buildNodePort(
  listUnassigned: NodeRepositoryPort['listUnassigned'],
): NodeRepositoryPort {
  return { listUnassigned } as NodeRepositoryPort;
}

function buildDiscoveredPort(
  listAll: DiscoveredNodeRepositoryPort['listAll'],
): DiscoveredNodeRepositoryPort {
  return { listAll } as DiscoveredNodeRepositoryPort;
}

describe('ListPendingAssignmentNodesUseCase', () => {
  it('returns mongo-backed unassigned nodes when no discovered node matches', async () => {
    const listUnassigned = jest.fn().mockResolvedValue([
      {
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        hostname: 'node-1.local',
        nodeType: 'server',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        rackId: null,
        positionCode: null,
        metadata: {},
      },
    ]);
    const listAll = jest.fn().mockResolvedValue([]);
    const useCase = new ListPendingAssignmentNodesUseCase(
      buildNodePort(listUnassigned),
      buildDiscoveredPort(listAll),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        nodeId: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        hostname: 'node-1.local',
        nodeType: 'server',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        rackId: null,
        positionCode: null,
        origin: 'mongo',
      },
    ]);
  });

  it('returns redis-backed discovered nodes when no canonical node exists', async () => {
    const listUnassigned = jest.fn().mockResolvedValue([]);
    const listAll = jest.fn().mockResolvedValue([
      {
        agentId: 'NODE-2',
        hostname: 'node-2.local',
        deviceType: 'server',
        source: 'gateway',
        lifecycleState: NodeLifecycleState.DISCOVERED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        siteCode: 'SITE-A',
        hardware: {},
        createdAt: '2026-07-09T10:00:00.000Z',
        updatedAt: '2026-07-09T10:05:00.000Z',
      },
    ]);
    const useCase = new ListPendingAssignmentNodesUseCase(
      buildNodePort(listUnassigned),
      buildDiscoveredPort(listAll),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        nodeCode: 'NODE-2',
        displayName: 'node-2.local',
        hostname: 'node-2.local',
        nodeType: 'server',
        source: 'gateway',
        lifecycleState: NodeLifecycleState.DISCOVERED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        siteCode: 'SITE-A',
        origin: 'redis',
        discoveredNode: {
          agentId: 'NODE-2',
          hostname: 'node-2.local',
          deviceType: 'server',
          source: 'gateway',
          lifecycleState: NodeLifecycleState.DISCOVERED,
          assignmentState: NodeAssignmentState.UNASSIGNED,
          logicalRackId: null,
          siteCode: 'SITE-A',
          hardware: {},
          createdAt: '2026-07-09T10:00:00.000Z',
          updatedAt: '2026-07-09T10:05:00.000Z',
        },
      },
    ]);
  });

  it('deduplicates matching mongo and redis entries by canonical node code', async () => {
    const discoveredNode = {
      agentId: 'NODE-3',
      hostname: 'node-3-discovered.local',
      deviceType: 'edge-server',
      source: 'gateway',
      lifecycleState: NodeLifecycleState.DISCOVERED,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      logicalRackId: null,
      siteCode: 'SITE-B',
      hardware: {
        vendor: 'Dell',
      },
      createdAt: '2026-07-09T11:00:00.000Z',
      updatedAt: '2026-07-09T11:05:00.000Z',
    };
    const listUnassigned = jest.fn().mockResolvedValue([
      {
        id: 'node-3',
        nodeCode: 'NODE-3',
        displayName: 'Canonical Node 3',
        hostname: undefined,
        nodeType: undefined,
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        rackId: null,
        positionCode: null,
        metadata: {},
      },
    ]);
    const listAll = jest.fn().mockResolvedValue([discoveredNode]);
    const useCase = new ListPendingAssignmentNodesUseCase(
      buildNodePort(listUnassigned),
      buildDiscoveredPort(listAll),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        nodeId: 'node-3',
        nodeCode: 'NODE-3',
        displayName: 'Canonical Node 3',
        hostname: 'node-3-discovered.local',
        nodeType: 'edge-server',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        rackId: null,
        positionCode: null,
        logicalRackId: null,
        siteCode: 'SITE-B',
        origin: 'merged',
        discoveredNode,
      },
    ]);
  });

  it('excludes discovered nodes that are already assigned', async () => {
    const listUnassigned = jest.fn().mockResolvedValue([]);
    const listAll = jest.fn().mockResolvedValue([
      {
        agentId: 'NODE-4',
        hostname: 'node-4.local',
        deviceType: 'workstation',
        source: 'gateway',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: 'rack-1',
        siteCode: 'SITE-C',
        hardware: {},
        createdAt: '2026-07-09T12:00:00.000Z',
        updatedAt: '2026-07-09T12:05:00.000Z',
      },
    ]);
    const useCase = new ListPendingAssignmentNodesUseCase(
      buildNodePort(listUnassigned),
      buildDiscoveredPort(listAll),
    );

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('excludes retired nodes from the pending assignment list', async () => {
    const listUnassigned = jest.fn().mockResolvedValue([
      {
        id: 'node-5',
        nodeCode: 'NODE-5',
        displayName: 'Node 5',
        source: 'collector',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      },
    ]);
    const listAll = jest.fn().mockResolvedValue([
      {
        agentId: 'NODE-6',
        hostname: 'node-6.local',
        deviceType: 'workstation',
        source: 'gateway',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        hardware: {},
        createdAt: '2026-07-09T13:00:00.000Z',
        updatedAt: '2026-07-09T13:05:00.000Z',
      },
    ]);
    const useCase = new ListPendingAssignmentNodesUseCase(
      buildNodePort(listUnassigned),
      buildDiscoveredPort(listAll),
    );

    const result = await useCase.execute();

    expect(result).toEqual([
      {
        nodeId: 'node-5',
        nodeCode: 'NODE-5',
        displayName: 'Node 5',
        source: 'collector',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        origin: 'mongo',
      },
      {
        nodeCode: 'NODE-6',
        displayName: 'node-6.local',
        hostname: 'node-6.local',
        nodeType: 'workstation',
        source: 'gateway',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        origin: 'redis',
        discoveredNode: {
          agentId: 'NODE-6',
          hostname: 'node-6.local',
          deviceType: 'workstation',
          source: 'gateway',
          lifecycleState: NodeLifecycleState.RETIRED,
          assignmentState: NodeAssignmentState.UNASSIGNED,
          logicalRackId: null,
          hardware: {},
          createdAt: '2026-07-09T13:00:00.000Z',
          updatedAt: '2026-07-09T13:05:00.000Z',
        },
      },
    ]);
  });
});
