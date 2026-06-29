import {
  NodeAssignmentState,
  NodeLifecycleState,
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import type {
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { BadRequestUseCaseError } from '@use-cases/errors/use-case.errors';
import { ConflictUseCaseError } from '@use-cases/errors/use-case.errors';
import { ActivateMarkerUseCase } from './marker.commands';
import {
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
    const nodeRepository: NodeRepositoryPort = {
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

    await expect(useCase.execute('node-1', 'rack-1', 'U01')).rejects.toBeInstanceOf(
      BadRequestUseCaseError,
    );
  });

  it('blocks assigning two nodes to the same rack position', async () => {
    const nodeUpdate = jest.fn();
    const nodeRepository: NodeRepositoryPort = {
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
    const nodeRepository: NodeRepositoryPort = {
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
    const nodeRepository: NodeRepositoryPort = {
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
      message: 'E11000 duplicate key error collection: nodes index: rackId_1_positionCode_1 dup key',
    });
    const nodeRepository: NodeRepositoryPort = {
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
    const nodeRepository: NodeRepositoryPort = {
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

  it('publishes a null mapping when normalizing a new node', async () => {
    const nodeRepository: NodeRepositoryPort = {
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
    };

    const useCase = new NormalizeNodeUseCase(
      nodeRepository,
      {
        ensureCodeAvailable: jest.fn().mockResolvedValue(undefined),
      } as never,
      nodeMappingPublisher as never,
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

  it('publishes the target rack mapping when assigning a node to a rack', async () => {
    const nodeRepository: NodeRepositoryPort = {
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
      nodeMappingPublisher as never,
    );

    await useCase.execute('node-1', 'rack-1', 'U01');

    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      'rack-1',
    );
  });

  it('publishes a null mapping when retiring a node', async () => {
    const nodeRepository: NodeRepositoryPort = {
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
      nodeMappingPublisher as never,
    );

    await useCase.execute('node-1');

    expect(nodeRepository.update).toHaveBeenCalledWith('node-1', {
      lifecycleState: NodeLifecycleState.RETIRED,
      rackId: null,
      positionCode: null,
      assignmentState: NodeAssignmentState.UNASSIGNED,
    });
    expect(discoveredNodeRepository.findByAgentId).toHaveBeenCalledWith('NODE-1');
    expect(discoveredNodeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleState: NodeLifecycleState.RETIRED,
        assignmentState: NodeAssignmentState.UNASSIGNED,
        logicalRackId: null,
      }),
    );
    expect(nodeMappingPublisher.publishNodeMapping).toHaveBeenCalledWith(
      'NODE-1',
      null,
    );
  });

  it('does not allow marker activation before validation', async () => {
    const markerRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'marker-1',
        markerCode: 'MK-1',
        lifecycleState: 'GENERATED',
      }),
      update: jest.fn(),
    };

    const useCase = new ActivateMarkerUseCase(markerRepository as never);

    await expect(useCase.execute('marker-1')).rejects.toBeInstanceOf(
      BadRequestUseCaseError,
    );
  });
});
