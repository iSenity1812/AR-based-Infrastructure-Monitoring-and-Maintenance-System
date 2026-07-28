import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';

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
}
