import {
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import type {
  DiscoveredNodeRepositoryPort,
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';

import { AssignDiscoveredNodeToRackUseCase } from './discovered-node.commands';
import {
  ActivateNodeUseCase,
  AssignNodeToRackUseCase,
} from './node-topology.commands';
import { UnifiedAssignNodeToRackUseCase } from './unified-assign-node.commands';

type SavedDiscoveredNode = {
  agentId: string;
  assignmentState: NodeAssignmentState;
  logicalRackId: string | null | undefined;
  siteCode?: string;
  hardware: {
    primaryIpv4?: string;
    hardwareSerial?: string;
  };
};

describe('UnifiedAssignNodeToRackUseCase', () => {
  it('delegates redis-backed assignment when the identifier is not found in Mongo', async () => {
    const executeDiscoveredAssign = jest.fn().mockResolvedValue({ ok: true });
    const assignDiscoveredNodeToRackUseCase = {
      execute: executeDiscoveredAssign,
    } as unknown as AssignDiscoveredNodeToRackUseCase;
    const assignNodeToRackUseCase = {
      execute: jest.fn(),
    } as unknown as AssignNodeToRackUseCase;
    const activateNodeUseCase = {
      execute: jest.fn(),
    } as unknown as ActivateNodeUseCase;
    const useCase = new UnifiedAssignNodeToRackUseCase(
      {
        findById: jest.fn().mockResolvedValue(null),
        findByCode: jest.fn().mockResolvedValue(null),
      } as unknown as NodeRepositoryPort,
      {
        findByAgentId: jest.fn(),
        save: jest.fn(),
      } as unknown as DiscoveredNodeRepositoryPort,
      {
        findById: jest.fn(),
      } as unknown as RackRepositoryPort,
      assignNodeToRackUseCase,
      activateNodeUseCase,
      assignDiscoveredNodeToRackUseCase,
    );

    await expect(
      useCase.execute({
        nodeId: 'agent-1',
        rackId: 'rack-1',
        positionCode: 'U01',
      }),
    ).resolves.toEqual({ ok: true });

    expect(executeDiscoveredAssign).toHaveBeenCalledWith(
      'agent-1',
      'rack-1',
      'U01',
      undefined,
    );
  });

  it('assigns a canonical node and syncs the existing redis record', async () => {
    const node = {
      id: 'node-1',
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
      hostname: 'node-1.local',
      nodeType: 'SERVER',
      source: 'collector',
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      serialNumber: 'SER-1',
      vendor: 'Dell',
      model: 'R740',
      managementIp: '10.0.0.10',
      metadata: {},
    };
    const existingDiscoveredNode = {
      agentId: 'NODE-1',
      hostname: 'Node 1 discovered',
      deviceType: 'SERVER',
      source: 'windows_exporter',
      lifecycleState: NodeLifecycleState.DISCOVERED,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      logicalRackId: null,
      siteCode: undefined,
      hardware: {
        primaryIpv4: '10.0.0.11',
      },
      createdAt: '2026-07-09T00:00:00.000Z',
      updatedAt: '2026-07-09T00:00:00.000Z',
    };
    const assignedNode = {
      ...node,
      rackId: 'rack-1',
      positionCode: 'U01',
      assignmentState: NodeAssignmentState.ASSIGNED,
    };
    const activatedNode = {
      ...assignedNode,
      lifecycleState: NodeLifecycleState.ACTIVE,
    };
    const nodeRepository = {
      findById: jest.fn().mockResolvedValue(node),
      findByCode: jest.fn(),
    } as unknown as NodeRepositoryPort;
    const saveDiscoveredNode = jest
      .fn<Promise<void>, [SavedDiscoveredNode]>()
      .mockResolvedValue(undefined);
    const discoveredNodeRepository = {
      findByAgentId: jest.fn().mockResolvedValue(existingDiscoveredNode),
      save: saveDiscoveredNode,
    } as unknown as DiscoveredNodeRepositoryPort;
    const rackRepository = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'rack-1', siteCode: 'SITE-A' }),
    } as unknown as RackRepositoryPort;
    const executeCanonicalAssign = jest.fn().mockResolvedValue(assignedNode);
    const executeActivateNode = jest.fn().mockResolvedValue(activatedNode);
    const assignNodeToRackUseCase = {
      execute: executeCanonicalAssign,
    } as unknown as AssignNodeToRackUseCase;
    const activateNodeUseCase = {
      execute: executeActivateNode,
    } as unknown as ActivateNodeUseCase;
    const assignDiscoveredNodeToRackUseCase = {
      execute: jest.fn(),
    } as unknown as AssignDiscoveredNodeToRackUseCase;
    const useCase = new UnifiedAssignNodeToRackUseCase(
      nodeRepository,
      discoveredNodeRepository,
      rackRepository,
      assignNodeToRackUseCase,
      activateNodeUseCase,
      assignDiscoveredNodeToRackUseCase,
    );

    const result = await useCase.execute({
      nodeId: 'node-1',
      rackId: 'rack-1',
      positionCode: 'U01',
    });

    expect(result.node).toEqual(activatedNode);
    expect(result.discoveredNode.agentId).toBe('NODE-1');
    expect(result.discoveredNode.logicalRackId).toBe('rack-1');
    expect(result.discoveredNode.lifecycleState).toBe(
      NodeLifecycleState.ACTIVE,
    );

    expect(executeCanonicalAssign).toHaveBeenCalledWith(
      'node-1',
      'rack-1',
      'U01',
      undefined,
    );
    expect(executeActivateNode).toHaveBeenCalledWith('node-1');
    const savedDiscoveredNode = saveDiscoveredNode.mock.calls[0]?.[0];
    if (!savedDiscoveredNode) {
      throw new Error('Expected discovered node save to be called');
    }
    expect(savedDiscoveredNode.agentId).toBe('NODE-1');
    expect(savedDiscoveredNode.assignmentState).toBe(
      NodeAssignmentState.ASSIGNED,
    );
    expect(savedDiscoveredNode.logicalRackId).toBe('rack-1');
    expect(savedDiscoveredNode.siteCode).toBe('SITE-A');
    expect(savedDiscoveredNode.hardware.primaryIpv4).toBe('10.0.0.10');
    expect(savedDiscoveredNode.hardware.hardwareSerial).toBe('SER-1');
  });

  it('creates a redis record when assigning a canonical node without a discovered entry', async () => {
    const assignedNode = {
      id: 'node-2',
      nodeCode: 'NODE-2',
      displayName: 'Node 2',
      hostname: 'node-2.local',
      nodeType: 'WORKSTATION',
      source: 'collector',
      lifecycleState: NodeLifecycleState.ACTIVE,
      assignmentState: NodeAssignmentState.ASSIGNED,
      serialNumber: 'SER-2',
      vendor: 'MSI',
      model: 'Alpha',
      managementIp: '10.0.0.20',
      rackId: 'rack-2',
      positionCode: 'U02',
      metadata: {},
    };
    const executeCanonicalAssign = jest.fn().mockResolvedValue(assignedNode);
    const executeActivateNode = jest.fn();
    const activateNodeUseCase = {
      execute: executeActivateNode,
    } as unknown as ActivateNodeUseCase;
    const useCase = new UnifiedAssignNodeToRackUseCase(
      {
        findById: jest.fn().mockResolvedValue(assignedNode),
        findByCode: jest.fn(),
      } as unknown as NodeRepositoryPort,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as DiscoveredNodeRepositoryPort,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'rack-2', siteCode: 'SITE-B' }),
      } as unknown as RackRepositoryPort,
      {
        execute: executeCanonicalAssign,
      } as unknown as AssignNodeToRackUseCase,
      activateNodeUseCase,
      {
        execute: jest.fn(),
      } as unknown as AssignDiscoveredNodeToRackUseCase,
    );

    const result = await useCase.execute({
      nodeId: 'node-2',
      rackId: 'rack-2',
      positionCode: 'U02',
    });

    expect(result.discoveredNode.agentId).toBe('NODE-2');
    expect(result.discoveredNode.assignmentState).toBe(
      NodeAssignmentState.ASSIGNED,
    );
    expect(result.discoveredNode.logicalRackId).toBe('rack-2');
    expect(result.discoveredNode.siteCode).toBe('SITE-B');
    expect(executeCanonicalAssign).toHaveBeenCalledWith(
      'node-2',
      'rack-2',
      'U02',
      undefined,
    );
    expect(executeActivateNode).not.toHaveBeenCalled();
  });

  it('resolves canonical assignment by node code when the identifier is not an ObjectId', async () => {
    const assignedNode = {
      id: 'node-3',
      nodeCode: 'node-msi-8ef8d6a7',
      displayName: 'Node 3',
      source: 'collector',
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.ASSIGNED,
      rackId: 'rack-3',
      positionCode: 'U03',
      metadata: {},
    };
    const activatedNode = {
      ...assignedNode,
      lifecycleState: NodeLifecycleState.ACTIVE,
    };
    const executeCanonicalAssign = jest.fn().mockResolvedValue(assignedNode);
    const executeActivateNode = jest.fn().mockResolvedValue(activatedNode);
    const useCase = new UnifiedAssignNodeToRackUseCase(
      {
        findById: jest.fn().mockResolvedValue(null),
        findByCode: jest.fn().mockResolvedValue({
          id: 'node-3',
          nodeCode: 'node-msi-8ef8d6a7',
          displayName: 'Node 3',
          source: 'collector',
          lifecycleState: NodeLifecycleState.READY,
          assignmentState: NodeAssignmentState.UNASSIGNED,
          metadata: {},
        }),
      } as unknown as NodeRepositoryPort,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as DiscoveredNodeRepositoryPort,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'rack-3', siteCode: 'SITE-C' }),
      } as unknown as RackRepositoryPort,
      {
        execute: executeCanonicalAssign,
      } as unknown as AssignNodeToRackUseCase,
      {
        execute: executeActivateNode,
      } as unknown as ActivateNodeUseCase,
      {
        execute: jest.fn(),
      } as unknown as AssignDiscoveredNodeToRackUseCase,
    );

    await useCase.execute({
      nodeId: 'node-msi-8ef8d6a7',
      rackId: 'rack-3',
      positionCode: 'U03',
    });

    expect(executeCanonicalAssign).toHaveBeenCalledWith(
      'node-3',
      'rack-3',
      'U03',
      undefined,
    );
    expect(executeActivateNode).toHaveBeenCalledWith('node-3');
  });

  it('reactivates retired canonical nodes before syncing redis', async () => {
    const retiredNode = {
      id: 'node-4',
      nodeCode: 'NODE-4',
      displayName: 'Node 4',
      hostname: 'node-4.local',
      nodeType: 'SERVER',
      source: 'collector',
      lifecycleState: NodeLifecycleState.RETIRED,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      serialNumber: 'SER-4',
      vendor: 'Dell',
      model: 'R750',
      managementIp: '10.0.0.40',
      metadata: {},
    };
    const assignedNode = {
      ...retiredNode,
      rackId: 'rack-4',
      positionCode: 'U04',
      assignmentState: NodeAssignmentState.ASSIGNED,
    };
    const activatedNode = {
      ...assignedNode,
      lifecycleState: NodeLifecycleState.ACTIVE,
    };
    const saveDiscoveredNode = jest
      .fn<Promise<void>, [SavedDiscoveredNode]>()
      .mockResolvedValue(undefined);
    const executeCanonicalAssign = jest.fn().mockResolvedValue(assignedNode);
    const executeActivateNode = jest.fn().mockResolvedValue(activatedNode);
    const useCase = new UnifiedAssignNodeToRackUseCase(
      {
        findById: jest.fn().mockResolvedValue(retiredNode),
        findByCode: jest.fn(),
      } as unknown as NodeRepositoryPort,
      {
        findByAgentId: jest.fn().mockResolvedValue({
          agentId: 'NODE-4',
          hostname: 'Node 4',
          deviceType: 'SERVER',
          source: 'collector',
          lifecycleState: NodeLifecycleState.RETIRED,
          assignmentState: NodeAssignmentState.UNASSIGNED,
          logicalRackId: null,
          hardware: {},
          createdAt: '2026-07-09T00:00:00.000Z',
          updatedAt: '2026-07-09T00:00:00.000Z',
        }),
        save: saveDiscoveredNode,
      } as unknown as DiscoveredNodeRepositoryPort,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'rack-4', siteCode: 'SITE-D' }),
      } as unknown as RackRepositoryPort,
      {
        execute: executeCanonicalAssign,
      } as unknown as AssignNodeToRackUseCase,
      {
        execute: executeActivateNode,
      } as unknown as ActivateNodeUseCase,
      {
        execute: jest.fn(),
      } as unknown as AssignDiscoveredNodeToRackUseCase,
    );

    const result = await useCase.execute({
      nodeId: 'node-4',
      rackId: 'rack-4',
      positionCode: 'U04',
    });

    expect(result.node).not.toBeNull();
    const reactivatedNode = result.node;
    if (!reactivatedNode) {
      throw new Error('Expected canonical node to be returned');
    }
    expect(reactivatedNode.lifecycleState).toBe(NodeLifecycleState.ACTIVE);
    expect(result.discoveredNode.lifecycleState).toBe(
      NodeLifecycleState.ACTIVE,
    );
    expect(executeActivateNode).toHaveBeenCalledWith('node-4');
    const savedDiscoveredNode = saveDiscoveredNode.mock.calls[0]?.[0];
    if (!savedDiscoveredNode) {
      throw new Error('Expected discovered node save to be called');
    }
    expect(savedDiscoveredNode.assignmentState).toBe(
      NodeAssignmentState.ASSIGNED,
    );
  });
});
