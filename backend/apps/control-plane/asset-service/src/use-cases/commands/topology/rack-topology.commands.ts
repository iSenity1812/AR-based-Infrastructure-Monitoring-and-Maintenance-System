import { Inject, Injectable } from '@nestjs/common';

import { AssetType } from '@domain/constants/asset-type.enum';
import {
  RackCapacityState,
  RackLifecycleState,
} from '@domain/entities/asset-context.entities';
import { NODE_REPOSITORY, RACK_REPOSITORY } from '@domain/ports/port.tokens';
import type {
  NodeRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import {
  BadRequestUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

@Injectable()
export class CreateRackUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(input: {
    rackCode: string;
    displayName: string;
    siteCode?: string;
    roomCode?: string;
    zoneCode?: string;
    rowCode?: string;
    positionCode?: string;
    capacityLimit?: number;
    notes?: string;
    vendor?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.assetContextReadService.ensureCodeAvailable(input.rackCode);

    return this.rackRepository.create({
      ...input,
      lifecycleState: RackLifecycleState.CREATED,
      capacityState: RackCapacityState.AVAILABLE,
      metadata: input.metadata ?? {},
    });
  }
}

@Injectable()
export class UpdateRackUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(
    rackId: string,
    input: {
      rackCode?: string;
      displayName?: string;
      siteCode?: string;
      roomCode?: string;
      zoneCode?: string;
      rowCode?: string;
      positionCode?: string;
      capacityLimit?: number;
      capacityState?: RackCapacityState;
      notes?: string;
      vendor?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.getRequiredRack(rackId);

    if (input.rackCode) {
      await this.assetContextReadService.ensureCodeAvailable(input.rackCode, {
        type: AssetType.RACK,
        id: rackId,
      });
    }

    const updated = await this.rackRepository.update(rackId, input);
    if (!updated) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }

  private async getRequiredRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }
}

@Injectable()
export class ConfirmRackReadyUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(rackId: string) {
    const rack = await this.getRequiredRack(rackId);
    if (rack.lifecycleState !== RackLifecycleState.CREATED) {
      throw new BadRequestUseCaseError(
        'Only newly created racks can be confirmed as ready.',
      );
    }

    return this.updateState(rackId, RackLifecycleState.READY);
  }

  private async getRequiredRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }

  private async updateState(
    rackId: string,
    lifecycleState: RackLifecycleState,
  ) {
    const updated = await this.rackRepository.update(rackId, {
      lifecycleState,
    });
    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }
}

@Injectable()
export class ActivateRackUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(rackId: string) {
    const rack = await this.getRequiredRack(rackId);
    if (rack.lifecycleState === RackLifecycleState.ACTIVE) {
      throw new BadRequestUseCaseError('Rack is already active');
    }

    const updated = await this.rackRepository.update(rackId, {
      lifecycleState: RackLifecycleState.ACTIVE,
    });

    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }

  private async getRequiredRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    return rack;
  }
}

@Injectable()
export class DrainRackUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(rackId: string) {
    const rack = await this.requireActiveRack(rackId);
    const updated = await this.rackRepository.update(rack.id, {
      lifecycleState: RackLifecycleState.DRAINING,
    });
    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }

  private async requireActiveRack(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }
    if (rack.lifecycleState !== RackLifecycleState.ACTIVE) {
      throw new BadRequestUseCaseError(
        'Only active racks can enter draining state.',
      );
    }
    return rack;
  }
}

@Injectable()
export class RetireRackUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(rackId: string) {
    const rack = await this.rackRepository.findById(rackId);
    if (!rack) {
      throw new NotFoundUseCaseError(
        `Rack ${rackId} was not found.`,
        ErrorCode.ASSET_RACK_NOT_FOUND,
      );
    }

    const nodes = await this.nodeRepository.listByRackId(rackId);
    const nonRetiredNodes = nodes.filter((node) => node.rackId === rackId);
    if (nonRetiredNodes.length > 0) {
      throw new BadRequestUseCaseError(
        'Rack cannot be retired while nodes are still assigned to it.',
        ErrorCode.ASSET_PARENT_INVALID,
      );
    }

    const updated = await this.rackRepository.update(rackId, {
      lifecycleState: RackLifecycleState.RETIRED,
    });
    await this.assetContextReadService.invalidateRackTopology(rackId);
    return updated;
  }
}
