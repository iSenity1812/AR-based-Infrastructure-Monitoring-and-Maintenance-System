import {
  NodeAssignmentState,
  NodeLifecycleState,
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import type { RackRepositoryPort } from '@domain/ports/repositories.port';
import { BadRequestUseCaseError } from '@use-cases/errors/use-case.errors';
import { ConflictUseCaseError } from '@use-cases/errors/use-case.errors';
import { ActivateMarkerUseCase } from './marker.commands';
import {
  ActivateNodeUseCase,
  AssignNodeToRackUseCase,
  ConfirmRackReadyUseCase,
  CreateRackUseCase,
  NormalizeNodeUseCase,
  RetireNodeUseCase,
  UpdateNodeUseCase,
} from './topology';

describe('asset lifecycle commands', () => {
  const nodeMappingPublisher = {
    publishNodeMapping: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    nodeMappingPublisher.publishNodeMapping.mockClear();
  });

  it('creates a rack in CREATED state with AVAILABLE capacity by default', async () => {
    const createdRack = {
      id: 'rack-1',
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
      lifecycleState: RackLifecycleState.CREATED,
      capacityState: RackCapacityState.AVAILABLE,
      metadata: {},
    };
    const create = jest.fn().mockResolvedValue(createdRack);
    const rackRepository: RackRepositoryPort = {
      create,
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };
    const assetContextReadService = {
      ensureCodeAvailable: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateRackUseCase(
      rackRepository,
      assetContextReadService as never,
    );

    const result = await useCase.execute({
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
    });

    expect(create).toHaveBeenCalledWith({
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
      lifecycleState: RackLifecycleState.CREATED,
      capacityState: RackCapacityState.AVAILABLE,
      metadata: {},
    });
    expect(result).toEqual(createdRack);
  });

  it('moves a created rack to READY', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 'rack-1',
      lifecycleState: RackLifecycleState.READY,
    });
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update,
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.CREATED,
        capacityState: RackCapacityState.AVAILABLE,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new ConfirmRackReadyUseCase(rackRepository, {
      invalidateRackTopology: jest.fn(),
    } as never);

    await useCase.execute('rack-1');

    expect(update).toHaveBeenCalledWith('rack-1', {
      lifecycleState: RackLifecycleState.READY,
    });
  });

  it('blocks assigning a node into a draining rack unless explicitly allowed', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.DRAINING,
        capacityState: RackCapacityState.AVAILABLE,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new AssignNodeToRackUseCase(
      nodeRepository,
      rackRepository,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    await expect(
      useCase.execute('node-1', 'rack-1', 'U01'),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
  });

  it('blocks assigning two nodes to the same rack position', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn().mockResolvedValue({
        id: 'node-2',
        nodeCode: 'NODE-2',
        displayName: 'Node 2',
        rackId: 'rack-1',
        positionCode: 'U22',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new AssignNodeToRackUseCase(
      nodeRepository,
      rackRepository,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    await expect(
      useCase.execute('node-1', 'rack-1', 'U22'),
    ).rejects.toBeInstanceOf(ConflictUseCaseError);
    expect(nodeUpdate).not.toHaveBeenCalled();
  });

  it('blocks assigning a node beyond the rack U capacity', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new AssignNodeToRackUseCase(
      nodeRepository,
      rackRepository,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    await expect(
      useCase.execute('node-1', 'rack-1', 'U20'),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(nodeUpdate).not.toHaveBeenCalled();
  });

  it('blocks updating a node position beyond the rack U capacity', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    await expect(
      useCase.execute('node-1', {
        positionCode: 'U20',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(nodeUpdate).not.toHaveBeenCalled();
  });

  it('maps duplicate key errors during node update to a conflict', async () => {
    const nodeUpdate = jest.fn().mockRejectedValue({
      code: 11000,
      message:
        'E11000 duplicate key error collection: nodes index: rackId_1_positionCode_1 dup key',
    });
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn().mockResolvedValue(null),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    await expect(
      useCase.execute('node-1', {
        positionCode: 'U08',
      }),
    ).rejects.toBeInstanceOf(ConflictUseCaseError);
  });

  it('resolves node updates by node code when the route parameter is not an ObjectId', async () => {
    const nodeUpdate = jest.fn().mockResolvedValue({
      id: 'node-1',
      nodeCode: 'node-msi-8ef8d6a7',
      displayName: 'Updated Node',
      source: 'collector',
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.ASSIGNED,
      metadata: {},
    });
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'node-msi-8ef8d6a7',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
    );

    const result = await useCase.execute('node-msi-8ef8d6a7', {
      displayName: 'Updated Node',
    });

    expect(nodeRepository.findById).toHaveBeenCalledWith('node-msi-8ef8d6a7');
    expect(nodeRepository.findByCode).toHaveBeenCalledWith('node-msi-8ef8d6a7');
    expect(nodeUpdate).toHaveBeenCalledWith('node-1', {
      displayName: 'Updated Node',
    });
    expect(result).toEqual({
      id: 'node-1',
      nodeCode: 'node-msi-8ef8d6a7',
      displayName: 'Updated Node',
      source: 'collector',
      lifecycleState: NodeLifecycleState.READY,
      assignmentState: NodeAssignmentState.ASSIGNED,
      metadata: {},
    });
  });

  it('supports unassigning a node through PATCH updates', async () => {
    const invalidateNodeContext = jest.fn();
    const invalidateRackTopology = jest.fn();
    const nodeUpdate = jest.fn().mockResolvedValue({
      id: 'node-1',
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
      source: 'collector',
      lifecycleState: NodeLifecycleState.ACTIVE,
      assignmentState: NodeAssignmentState.UNASSIGNED,
      metadata: {},
    });
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext,
        invalidateRackTopology,
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute('node-1', {
      rackId: null,
      positionCode: null,
    });

    expect(nodeUpdate).toHaveBeenCalledWith('node-1', {
      rackId: null,
      positionCode: null,
      assignmentState: NodeAssignmentState.UNASSIGNED,
    });
    expect(invalidateNodeContext).toHaveBeenCalledWith('node-1');
    expect(invalidateRackTopology).toHaveBeenCalledWith('rack-1');
    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      null,
    );
  });

  it('supports moving a node to another rack through PATCH updates', async () => {
    const invalidateNodeContext = jest.fn();
    const invalidateRackTopology = jest.fn();
    const nodeUpdate = jest.fn().mockResolvedValue({
      id: 'node-1',
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
      rackId: 'rack-2',
      positionCode: 'U03',
      source: 'collector',
      lifecycleState: NodeLifecycleState.ACTIVE,
      assignmentState: NodeAssignmentState.MOVED,
      metadata: {},
    });
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn().mockResolvedValue(null),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-2',
        rackCode: 'RACK-B1',
        displayName: 'Rack B1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext,
        invalidateRackTopology,
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute('node-1', {
      rackId: 'rack-2',
      positionCode: 'U03',
    });

    expect(nodeUpdate).toHaveBeenCalledWith('node-1', {
      rackId: 'rack-2',
      positionCode: 'U03',
      assignmentState: NodeAssignmentState.MOVED,
    });
    expect(invalidateNodeContext).toHaveBeenCalledWith('node-1');
    expect(invalidateRackTopology).toHaveBeenCalledWith('rack-1');
    expect(invalidateRackTopology).toHaveBeenCalledWith('rack-2');
    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      'rack-2',
    );
  });

  it('blocks moving a node to a retired rack through PATCH updates', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository = {
      create: jest.fn(),
      update: nodeUpdate,
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn().mockResolvedValue(null),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-2',
        rackCode: 'RACK-B1',
        displayName: 'Rack B1',
        lifecycleState: RackLifecycleState.RETIRED,
        capacityState: RackCapacityState.AVAILABLE,
        capacityLimit: 12,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      {
        findByAgentId: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      } as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
      nodeMappingPublisher,
    );

    await expect(
      useCase.execute('node-1', {
        rackId: 'rack-2',
        positionCode: 'U03',
      }),
    ).rejects.toBeInstanceOf(BadRequestUseCaseError);
    expect(nodeUpdate).not.toHaveBeenCalled();
  });

  it('syncs discovered node state in Redis when PATCH unassigns a node', async () => {
    const discoveredNodeRepository = {
      findByAgentId: jest.fn().mockResolvedValue({
        agentId: 'NODE-1',
        hostname: 'Node 1',
        deviceType: 'SERVER',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: 'rack-1',
        hardware: {},
        createdAt: '2026-06-17T08:00:00.000Z',
        updatedAt: '2026-06-17T08:00:00.000Z',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const nodeRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U08',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new UpdateNodeUseCase(
      nodeRepository,
      rackRepository,
      discoveredNodeRepository as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute('node-1', {
      rackId: null,
      positionCode: null,
    });

    expect(discoveredNodeRepository.findByAgentId).toHaveBeenCalledWith(
      'NODE-1',
    );
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
        siteCode: undefined,
      }),
    );
  });

  it('publishes a null mapping when normalizing a new node', async () => {
    const nodeRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };

    const useCase = new NormalizeNodeUseCase(
      nodeRepository,
      {
        ensureCodeAvailable: jest.fn().mockResolvedValue(undefined),
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute({
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
      source: 'collector',
    });

    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      null,
    );
  });

  it('does not fail node normalization when mapping publish fails', async () => {
    const nodeRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    nodeMappingPublisher.publishNodeMapping.mockRejectedValueOnce(
      new Error('kafka unavailable'),
    );

    const useCase = new NormalizeNodeUseCase(
      nodeRepository,
      {
        ensureCodeAvailable: jest.fn().mockResolvedValue(undefined),
      } as never,
      nodeMappingPublisher,
    );

    await expect(
      useCase.execute({
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
      }),
    ).resolves.toMatchObject({
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
    });
  });

  it('skips mapping publish when normalization is called without publish enabled', async () => {
    const nodeRepository = {
      create: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      update: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };

    const useCase = new NormalizeNodeUseCase(
      nodeRepository,
      {
        ensureCodeAvailable: jest.fn().mockResolvedValue(undefined),
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute(
      {
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
      },
      {
        publishNodeMapping: false,
      },
    );

    expect(nodeMappingPublisher.publishNodeMapping).not.toHaveBeenCalled();
  });

  it('publishes the target rack mapping when assigning a node to a rack', async () => {
    const nodeRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U01',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.READY,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn().mockResolvedValue(null),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new AssignNodeToRackUseCase(
      nodeRepository,
      rackRepository,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute('node-1', 'rack-1', 'U01');

    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      'rack-1',
    );
  });

  it('syncs discovered node state in Redis when activating a retired assigned node', async () => {
    const nodeRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U01',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        positionCode: 'U01',
        source: 'collector',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const discoveredNodeRepository = {
      findByAgentId: jest.fn().mockResolvedValue({
        agentId: 'NODE-1',
        hostname: 'Node 1',
        deviceType: 'SERVER',
        source: 'collector',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: null,
        hardware: {},
        createdAt: '2026-06-17T08:00:00.000Z',
        updatedAt: '2026-06-17T08:00:00.000Z',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const rackRepository: RackRepositoryPort = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'rack-1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: RackLifecycleState.READY,
        capacityState: RackCapacityState.AVAILABLE,
        siteCode: 'SITE-A',
        metadata: {},
      }),
      findByCode: jest.fn(),
      listAll: jest.fn(),
    };

    const useCase = new ActivateNodeUseCase(
      nodeRepository,
      discoveredNodeRepository as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
      rackRepository,
    );

    await useCase.execute('node-1');

    expect(discoveredNodeRepository.findByAgentId).toHaveBeenCalledWith(
      'NODE-1',
    );
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: 'rack-1',
        siteCode: 'SITE-A',
      }),
    );
  });

  it('does not publish a mapping change when retiring a node without unassigning it', async () => {
    const nodeRepository = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        metadata: {},
      }),
      findById: jest.fn().mockResolvedValue({
        id: 'node-1',
        nodeCode: 'NODE-1',
        displayName: 'Node 1',
        rackId: 'rack-1',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        metadata: {},
      }),
      findByCode: jest.fn(),
      findByRackIdAndPositionCode: jest.fn(),
      listAll: jest.fn(),
      listByRackId: jest.fn(),
      listUnassigned: jest.fn(),
    };
    const discoveredNodeRepository = {
      findByAgentId: jest.fn().mockResolvedValue({
        agentId: 'NODE-1',
        hostname: 'Node 1',
        deviceType: 'SERVER',
        source: 'collector',
        lifecycleState: NodeLifecycleState.ACTIVE,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: 'rack-1',
        hardware: {},
        createdAt: '2026-06-17T08:00:00.000Z',
        updatedAt: '2026-06-17T08:00:00.000Z',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new RetireNodeUseCase(
      nodeRepository,
      discoveredNodeRepository as never,
      {
        invalidateNodeContext: jest.fn(),
        invalidateRackTopology: jest.fn(),
      } as never,
      nodeMappingPublisher,
    );

    await useCase.execute('node-1');

    expect(nodeRepository.update).toHaveBeenCalledWith('node-1', {
      lifecycleState: NodeLifecycleState.RETIRED,
      assignmentState: NodeAssignmentState.ASSIGNED,
    });
    expect(discoveredNodeRepository.findByAgentId).toHaveBeenCalledWith(
      'NODE-1',
    );
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.ASSIGNED,
        logicalRackId: null,
      }),
    );
    expect(nodeMappingPublisher.publishNodeMapping).not.toHaveBeenCalled();
  });

  it('allows mapped inactive markers to activate without a validation workflow', async () => {
    const markerRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'marker-1',
        markerCode: 'MK-1',
        lifecycleState: 'INACTIVE',
        targetType: 'RACK',
        targetId: 'rack-1',
      }),
      update: jest.fn(),
    };

    const useCase = new ActivateMarkerUseCase(
      markerRepository as never,
      {
        invalidateMarkerResolution: jest.fn(),
      } as never,
    );

    await useCase.execute('marker-1');

    expect(markerRepository.update).toHaveBeenCalledWith('marker-1', {
      lifecycleState: 'ACTIVE',
      isActive: true,
      bindingStatus: 'ACTIVE',
      isVisibleInAr: true,
    });
  });
});
