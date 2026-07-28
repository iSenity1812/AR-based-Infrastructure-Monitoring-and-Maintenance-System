import { Injectable } from '@nestjs/common';

import { AssetType } from '@domain/constants/asset-type.enum';
import { ErrorCode } from '@shared/errors/ts/error-code.enum';
import { NotFoundUseCaseError } from '@use-cases/errors/use-case.errors';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

@Injectable()
export class GetTopologyTreeUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute() {
    return this.assetContextReadService.getTopologyTree();
  }
}

@Injectable()
export class GetRackTopologyUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(rackId: string) {
    return this.assetContextReadService.getRackTopology(rackId);
  }
}

@Injectable()
export class GetRackSummaryUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(rackId: string) {
    return this.assetContextReadService.getRackSummary(rackId);
  }
}

@Injectable()
export class GetRackSummaryByCodeUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(rackCode: string) {
    return this.assetContextReadService.getRackSummaryByCode(rackCode);
  }
}

@Injectable()
export class ListRackSummariesUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute() {
    return this.assetContextReadService.listRackSummaries();
  }
}

@Injectable()
export class BatchGetRackSummariesUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(rackIds: string[]) {
    return this.assetContextReadService.batchGetRackSummaries(rackIds);
  }
}

@Injectable()
export class GetNodeContextUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(nodeId: string) {
    return this.assetContextReadService.getNodeContext(nodeId);
  }
}

@Injectable()
export class GetAssetByCodeUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(code: string) {
    const asset = await this.assetContextReadService.findAssetByCode(code);
    if (!asset) {
      throw new NotFoundUseCaseError(
        `Asset code ${code} was not found.`,
        ErrorCode.NOT_FOUND,
      );
    }

    return asset;
  }
}

@Injectable()
export class GetAssetByIdUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute(type: AssetType, assetId: string) {
    const asset = await this.assetContextReadService.findAssetById(
      type,
      assetId,
    );
    if (!asset) {
      throw new NotFoundUseCaseError(
        `Asset ${type}:${assetId} was not found.`,
        ErrorCode.NOT_FOUND,
      );
    }

    return asset;
  }
}

@Injectable()
export class ResolveMarkerUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(markerCode: string) {
    return this.assetContextReadService.resolveMarker(markerCode);
  }
}

@Injectable()
export class SearchAssetsUseCase {
  constructor(
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  execute(query?: string, type?: AssetType) {
    return this.assetContextReadService.searchAssets(query, type);
  }
}
