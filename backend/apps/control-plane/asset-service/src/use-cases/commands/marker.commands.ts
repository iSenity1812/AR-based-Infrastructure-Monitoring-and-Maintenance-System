import { Inject, Injectable } from '@nestjs/common';

import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import {
  MarkerLifecycleState,
  NodeLifecycleState,
} from '@domain/entities/asset-context.entities';
import { MARKER_REPOSITORY, NODE_REPOSITORY } from '@domain/ports/port.tokens';
import type {
  MarkerRepositoryPort,
  NodeRepositoryPort,
} from '@domain/ports/repositories.port';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import {
  BadRequestUseCaseError,
  NotFoundUseCaseError,
} from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

@Injectable()
export class CreateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(input: {
    markerCode: string;
    displayLabel?: string;
    targetType?: MarkerTargetType;
    targetId?: string;
    imageTargetId?: string;
    notes?: string;
    worldTrackingEnabled?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const existing = await this.markerRepository.findByCode(input.markerCode);
    if (existing) {
      throw new BadRequestUseCaseError(
        `Marker code ${input.markerCode} is already in use.`,
        ErrorCode.ASSET_CODE_CONFLICT,
      );
    }

    if (input.targetType && input.targetId) {
      await this.assetContextReadService.validateMarkerTarget(
        input.targetType,
        input.targetId,
      );
    }

    const marker = await this.markerRepository.create({
      ...input,
      lifecycleState: MarkerLifecycleState.DRAFT,
      bindingStatus: input.targetId ? 'BOUND_PENDING_VALIDATION' : 'UNBOUND',
      isActive: false,
      isVisibleInAr: false,
      worldTrackingEnabled: input.worldTrackingEnabled ?? true,
      metadata: input.metadata ?? {},
    });

    if (input.targetType === MarkerTargetType.NODE && input.targetId) {
      await this.assetContextReadService.invalidateNodeContext(
        input.targetId,
        input.markerCode,
      );
    }
    if (input.targetType === MarkerTargetType.RACK && input.targetId) {
      await this.assetContextReadService.invalidateRackTopology(input.targetId);
      await this.assetContextReadService.invalidateMarkerResolution(
        input.markerCode,
      );
    }

    return marker;
  }
}

@Injectable()
export class UpdateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(
    markerId: string,
    input: {
      markerCode?: string;
      displayLabel?: string;
      imageTargetId?: string;
      notes?: string;
      worldTrackingEnabled?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    const marker = await this.getRequiredMarker(markerId);
    if (input.markerCode && input.markerCode !== marker.markerCode) {
      const existing = await this.markerRepository.findByCode(input.markerCode);
      if (existing) {
        throw new BadRequestUseCaseError(
          `Marker code ${input.markerCode} is already in use.`,
          ErrorCode.ASSET_CODE_CONFLICT,
        );
      }
    }

    const updated = await this.markerRepository.update(markerId, input);
    await this.assetContextReadService.invalidateMarkerResolution(
      marker.markerCode,
    );
    if (updated?.markerCode && updated.markerCode !== marker.markerCode) {
      await this.assetContextReadService.invalidateMarkerResolution(
        updated.markerCode,
      );
    }
    return updated;
  }

  private async getRequiredMarker(markerId: string) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }

    return marker;
  }
}

@Injectable()
export class GenerateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    return this.transition(markerId, [MarkerLifecycleState.DRAFT], {
      lifecycleState: MarkerLifecycleState.GENERATED,
    });
  }

  private async transition(
    markerId: string,
    allowed: MarkerLifecycleState[],
    patch: Record<string, unknown>,
  ) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (!allowed.includes(marker.lifecycleState)) {
      throw new BadRequestUseCaseError('Marker is not in the expected state.');
    }
    return this.markerRepository.update(markerId, patch);
  }
}

@Injectable()
export class PrintMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    return this.transition(markerId, [MarkerLifecycleState.GENERATED], {
      lifecycleState: MarkerLifecycleState.PRINTED,
    });
  }

  private async transition(
    markerId: string,
    allowed: MarkerLifecycleState[],
    patch: Record<string, unknown>,
  ) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (!allowed.includes(marker.lifecycleState)) {
      throw new BadRequestUseCaseError('Marker is not in the expected state.');
    }
    return this.markerRepository.update(markerId, patch);
  }
}

@Injectable()
export class MountMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    return this.transition(markerId, [MarkerLifecycleState.PRINTED], {
      lifecycleState: MarkerLifecycleState.MOUNTED,
      isVisibleInAr: true,
    });
  }

  private async transition(
    markerId: string,
    allowed: MarkerLifecycleState[],
    patch: Record<string, unknown>,
  ) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (!allowed.includes(marker.lifecycleState)) {
      throw new BadRequestUseCaseError('Marker is not in the expected state.');
    }
    return this.markerRepository.update(markerId, patch);
  }
}

@Injectable()
export class ValidateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    return this.transition(
      markerId,
      [MarkerLifecycleState.MOUNTED, MarkerLifecycleState.REMAPPED],
      {
        lifecycleState: MarkerLifecycleState.VALIDATED,
        bindingStatus: 'VALIDATED',
        lastValidatedAt: new Date().toISOString(),
      },
    );
  }

  private async transition(
    markerId: string,
    allowed: MarkerLifecycleState[],
    patch: Record<string, unknown>,
  ) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (!allowed.includes(marker.lifecycleState)) {
      throw new BadRequestUseCaseError('Marker is not in the expected state.');
    }
    return this.markerRepository.update(markerId, patch);
  }
}

@Injectable()
export class ActivateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (marker.lifecycleState !== MarkerLifecycleState.VALIDATED) {
      throw new BadRequestUseCaseError(
        'Marker must be validated before activation.',
      );
    }
    return this.markerRepository.update(markerId, {
      lifecycleState: MarkerLifecycleState.ACTIVE,
      isActive: true,
      bindingStatus: 'ACTIVE',
      isVisibleInAr: true,
    });
  }
}

@Injectable()
export class RemapMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(
    markerId: string,
    targetType: MarkerTargetType,
    targetId: string,
  ) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }

    await this.assetContextReadService.validateMarkerTarget(
      targetType,
      targetId,
    );
    if (targetType === MarkerTargetType.NODE) {
      const node = await this.nodeRepository.findById(targetId);
      if (node?.lifecycleState === NodeLifecycleState.RETIRED) {
        throw new BadRequestUseCaseError(
          'Retired nodes cannot receive new markers.',
        );
      }
    }

    const updated = await this.markerRepository.update(markerId, {
      targetType,
      targetId,
      lifecycleState: MarkerLifecycleState.REMAPPED,
      isActive: false,
      bindingStatus: 'REMAPPED_PENDING_VALIDATION',
      isVisibleInAr: true,
    });

    await this.assetContextReadService.invalidateMarkerResolution(
      marker.markerCode,
    );
    return updated;
  }
}

@Injectable()
export class RetireMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
  ) {}

  async execute(markerId: string) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }

    return this.markerRepository.update(markerId, {
      lifecycleState: MarkerLifecycleState.RETIRED,
      isActive: false,
      isVisibleInAr: false,
      bindingStatus: 'RETIRED',
    });
  }
}
