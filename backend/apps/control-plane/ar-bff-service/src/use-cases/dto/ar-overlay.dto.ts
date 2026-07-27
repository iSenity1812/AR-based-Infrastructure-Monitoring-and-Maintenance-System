import type { ArResolvedAssetDto } from './ar-asset.dto';
import type { ArAvailabilityDto } from './ar-asset.dto';
import type { ArWorkOrderSummaryDto } from './ar-work-order.dto';

export interface ArOverlayInputDto {
  markerCode?: string;
  asset?: {
    assetType: 'rack' | 'node';
    assetCode: string;
  };
}

export interface ArOverlayDto {
  source: {
    markerCode?: string;
    assetCode: string;
  };
  asset: ArResolvedAssetDto;
  monitoring: {
    availability: ArAvailabilityDto;
    summary?: unknown;
  };
  workOrders: {
    availability: ArAvailabilityDto;
    items: ArWorkOrderSummaryDto[];
  };
}
