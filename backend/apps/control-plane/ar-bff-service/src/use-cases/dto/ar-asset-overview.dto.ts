import type { ArAvailabilityDto, ArResolvedAssetDto } from './ar-asset.dto';

export interface ArAssetOverviewDto {
  asset: ArResolvedAssetDto;
  monitoring: {
    availability: ArAvailabilityDto;
    summary?: unknown;
  };
}
