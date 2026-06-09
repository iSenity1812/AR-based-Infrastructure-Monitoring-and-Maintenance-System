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
import { ActivateMarkerUseCase } from './marker.commands';
import {
  AssignNodeToRackUseCase,
  ConfirmRackReadyUseCase,
  CreateRackUseCase,
} from './topology';

describe('asset lifecycle commands', () => {
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

    await expect(useCase.execute('node-1', 'rack-1')).rejects.toBeInstanceOf(
      BadRequestUseCaseError,
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
