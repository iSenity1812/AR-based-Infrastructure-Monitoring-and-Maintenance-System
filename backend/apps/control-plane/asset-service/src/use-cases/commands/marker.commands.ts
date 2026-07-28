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

    return this.markerRepository.create({
      ...input,
      lifecycleState: MarkerLifecycleState.INACTIVE,
      bindingStatus: 'INACTIVE',
      isActive: false,
      isVisibleInAr: false,
      worldTrackingEnabled: input.worldTrackingEnabled ?? true,
      metadata: input.metadata ?? {},
    });
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
export class ActivateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(markerId: string) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }
    if (!marker.targetType || !marker.targetId) {
      throw new BadRequestUseCaseError(
        'Marker must be mapped before activation.',
        ErrorCode.ASSET_MARKER_TARGET_INVALID,
      );
    }
    const updated = await this.markerRepository.update(markerId, {
      lifecycleState: MarkerLifecycleState.ACTIVE,
      isActive: true,
      bindingStatus: 'ACTIVE',
      isVisibleInAr: true,
    });

    await this.assetContextReadService.invalidateMarkerResolution(
      marker.markerCode,
    );
    return updated;
  }
}

@Injectable()
export class DeactivateMarkerUseCase {
  constructor(
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(markerId: string) {
    const marker = await this.markerRepository.findById(markerId);
    if (!marker) {
      throw new NotFoundUseCaseError(
        `Marker ${markerId} was not found.`,
        ErrorCode.ASSET_MARKER_NOT_FOUND,
      );
    }

    const updated = await this.markerRepository.update(markerId, {
      lifecycleState: MarkerLifecycleState.INACTIVE,
      isActive: false,
      bindingStatus: 'INACTIVE',
      isVisibleInAr: false,
    });

    await this.assetContextReadService.invalidateMarkerResolution(
      marker.markerCode,
    );
    return updated;
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
      lifecycleState: MarkerLifecycleState.INACTIVE,
      isActive: false,
      bindingStatus: 'INACTIVE',
      isVisibleInAr: false,
    });

    await this.assetContextReadService.invalidateMarkerResolution(
      marker.markerCode,
    );
    return updated;
  }
}
