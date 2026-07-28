import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';
import type {
  ArAssetType,
  ArResolvedAssetDto,
} from '@use-cases/dto/ar-asset.dto';

export interface ResolveMarkerOptions {
  authorization?: string;
  requestId?: string;
  correlationId?: string;
}

export abstract class AssetServiceClientPort {
  abstract readonly serviceName: 'asset-service';

  abstract resolveMarker(
    markerCode: string,
    options?: ResolveMarkerOptions,
  ): Promise<AssetMarkerResolutionDto>;

  abstract resolveAssetById(
    assetType: ArAssetType,
    assetId: string,
    options?: ResolveMarkerOptions,
  ): Promise<ArResolvedAssetDto>;

  abstract resolveAssetByCode(
    assetType: ArAssetType,
    assetCode: string,
    options?: ResolveMarkerOptions,
  ): Promise<ArResolvedAssetDto>;
}
