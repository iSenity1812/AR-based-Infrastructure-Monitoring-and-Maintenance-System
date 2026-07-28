import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import {
  MarkerLifecycleState,
  NodeAssignmentState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import type {
  MarkerRepositoryPort,
  NodeRepositoryPort,
} from '@domain/ports/repositories.port';
import { BadRequestUseCaseError } from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';
import {
  ActivateMarkerUseCase,
  CreateMarkerUseCase,
  DeactivateMarkerUseCase,
  RemapMarkerUseCase,
} from './marker.commands';

describe('marker lifecycle commands', () => {
  const markerRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    listAll: jest.fn(),
    listByTarget: jest.fn(),
  } satisfies jest.Mocked<MarkerRepositoryPort>;
  const nodeRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByRackIdAndPositionCode: jest.fn(),
    listAll: jest.fn(),
    listByRackId: jest.fn(),
    listUnassigned: jest.fn(),
  } satisfies jest.Mocked<NodeRepositoryPort>;
  const assetContextReadService = {
    validateMarkerTarget: jest.fn(),
    invalidateMarkerResolution: jest.fn(),
  } satisfies Pick<
    jest.Mocked<AssetContextReadService>,
    'validateMarkerTarget' | 'invalidateMarkerResolution'
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates markers inactive by default', async () => {
    markerRepository.findByCode.mockResolvedValue(null);
    markerRepository.create.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      targetType: MarkerTargetType.RACK,
      targetId: 'rack-1',
      lifecycleState: MarkerLifecycleState.INACTIVE,
      bindingStatus: 'INACTIVE',
      isActive: false,
      isVisibleInAr: false,
      worldTrackingEnabled: true,
      metadata: {},
    });

    const useCase = new CreateMarkerUseCase(
      markerRepository,
      assetContextReadService as unknown as AssetContextReadService,
    );

    await expect(
      useCase.execute({
        markerCode: 'MK-1',
        targetType: MarkerTargetType.RACK,
        targetId: 'rack-1',
      }),
    ).resolves.toMatchObject({
      lifecycleState: MarkerLifecycleState.INACTIVE,
      bindingStatus: 'INACTIVE',
      isActive: false,
      isVisibleInAr: false,
    });
    expect(markerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleState: MarkerLifecycleState.INACTIVE,
        bindingStatus: 'INACTIVE',
        isActive: false,
        isVisibleInAr: false,
      }),
    );
  });

  it('activates an inactive marker for AR scanning', async () => {
    markerRepository.findById.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      lifecycleState: MarkerLifecycleState.INACTIVE,
      targetType: MarkerTargetType.RACK,
      targetId: 'rack-1',
      bindingStatus: 'INACTIVE',
      isActive: false,
      isVisibleInAr: false,
      worldTrackingEnabled: true,
      metadata: {},
    });

    const useCase = new ActivateMarkerUseCase(
      markerRepository,
      assetContextReadService as unknown as AssetContextReadService,
    );

    await useCase.execute('marker-1');

    expect(markerRepository.update).toHaveBeenCalledWith('marker-1', {
      lifecycleState: MarkerLifecycleState.ACTIVE,
      isActive: true,
      bindingStatus: 'ACTIVE',
      isVisibleInAr: true,
    });
    expect(
      assetContextReadService.invalidateMarkerResolution,
    ).toHaveBeenCalledWith('MK-1');
  });

  it('deactivates an active marker so AR scanning rejects it', async () => {
    markerRepository.findById.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      lifecycleState: MarkerLifecycleState.ACTIVE,
      bindingStatus: 'ACTIVE',
      isActive: true,
      isVisibleInAr: true,
      worldTrackingEnabled: true,
      metadata: {},
    });

    const useCase = new DeactivateMarkerUseCase(
      markerRepository,
      assetContextReadService as unknown as AssetContextReadService,
    );

    await useCase.execute('marker-1');

    expect(markerRepository.update).toHaveBeenCalledWith('marker-1', {
      lifecycleState: MarkerLifecycleState.INACTIVE,
      isActive: false,
      bindingStatus: 'INACTIVE',
      isVisibleInAr: false,
    });
    expect(
      assetContextReadService.invalidateMarkerResolution,
    ).toHaveBeenCalledWith('MK-1');
  });

  it('remaps markers back to inactive until explicitly activated again', async () => {
    markerRepository.findById.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      lifecycleState: MarkerLifecycleState.ACTIVE,
      bindingStatus: 'ACTIVE',
      isActive: true,
      isVisibleInAr: true,
      worldTrackingEnabled: true,
      metadata: {},
    });
    nodeRepository.findById.mockResolvedValue({
      id: 'node-1',
      nodeCode: 'NODE-1',
      displayName: 'Node 1',
      source: 'manual',
      lifecycleState: NodeLifecycleState.ACTIVE,
      assignmentState: NodeAssignmentState.ASSIGNED,
      metadata: {},
    });

    const useCase = new RemapMarkerUseCase(
      markerRepository,
      nodeRepository,
      assetContextReadService as unknown as AssetContextReadService,
    );

    await useCase.execute('marker-1', MarkerTargetType.NODE, 'node-1');

    expect(markerRepository.update).toHaveBeenCalledWith('marker-1', {
      targetType: MarkerTargetType.NODE,
      targetId: 'node-1',
      lifecycleState: MarkerLifecycleState.INACTIVE,
      isActive: false,
      bindingStatus: 'INACTIVE',
      isVisibleInAr: false,
    });
  });

  it('does not activate an unmapped marker', async () => {
    markerRepository.findById.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      lifecycleState: MarkerLifecycleState.INACTIVE,
      bindingStatus: 'INACTIVE',
      isActive: false,
      isVisibleInAr: false,
      worldTrackingEnabled: true,
      metadata: {},
    });

    const useCase = new ActivateMarkerUseCase(
      markerRepository,
      assetContextReadService as unknown as AssetContextReadService,
    );

    await expect(useCase.execute('marker-1')).rejects.toBeInstanceOf(
      BadRequestUseCaseError,
    );
    expect(markerRepository.update).not.toHaveBeenCalled();
  });
});
