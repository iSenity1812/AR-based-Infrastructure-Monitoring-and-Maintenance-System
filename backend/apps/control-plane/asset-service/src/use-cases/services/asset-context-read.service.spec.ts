import { AssetType } from '@domain/constants/asset-type.enum';
import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import {
  MarkerLifecycleState,
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import { BadRequestUseCaseError } from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from './asset-context-read.service';

describe('AssetContextReadService marker resolution', () => {
  const rack = {
    id: 'rack-1',
    rackCode: 'RACK-1',
    displayName: 'Rack 1',
    lifecycleState: RackLifecycleState.ACTIVE,
    capacityState: RackCapacityState.AVAILABLE,
    metadata: {},
  };
  const rackRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    listAll: jest.fn(),
  };
  const nodeRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByRackIdAndPositionCode: jest.fn(),
    listAll: jest.fn(),
    listByRackId: jest.fn(),
    listUnassigned: jest.fn(),
  };
  const markerRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    listAll: jest.fn(),
    listByTarget: jest.fn(),
  };
  const snapshotRepository = {
    upsert: jest.fn(),
    findByNodeId: jest.fn(),
    listAll: jest.fn(),
  };
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cache.get.mockResolvedValue(undefined);
    rackRepository.findById.mockResolvedValue(rack);
  });

  it('resolves active markers', async () => {
    markerRepository.findByCode.mockResolvedValue({
      id: 'marker-1',
      markerCode: 'MK-1',
      lifecycleState: MarkerLifecycleState.ACTIVE,
      targetType: MarkerTargetType.RACK,
      targetId: 'rack-1',
      bindingStatus: 'ACTIVE',
      isActive: true,
      isVisibleInAr: true,
      worldTrackingEnabled: true,
      metadata: {},
    });

    const service = new AssetContextReadService(
      rackRepository,
      nodeRepository,
      markerRepository,
      snapshotRepository,
      cache,
    );

    await expect(service.resolveMarker('MK-1')).resolves.toMatchObject({
      target: {
        id: 'rack-1',
        type: AssetType.RACK,
        code: 'RACK-1',
      },
    });
  });

  it('rejects inactive markers', async () => {
    markerRepository.findByCode.mockResolvedValue({
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

    const service = new AssetContextReadService(
      rackRepository,
      nodeRepository,
      markerRepository,
      snapshotRepository,
      cache,
    );

    await expect(service.resolveMarker('MK-1')).rejects.toMatchObject({
      errorCode: ErrorCode.ASSET_MARKER_NOT_ACTIVE,
    });
    await expect(service.resolveMarker('MK-1')).rejects.toBeInstanceOf(
      BadRequestUseCaseError,
    );
  });
});
