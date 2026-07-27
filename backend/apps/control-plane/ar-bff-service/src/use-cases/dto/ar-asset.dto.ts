export type ArAssetType = 'rack' | 'node';

export interface ArResolvedAssetDto {
  assetId: string;
  assetType: ArAssetType;
  assetCode: string;
  displayName: string;
  parentRack?: {
    rackId: string;
    rackCode: string;
    displayName?: string;
  };
}

export interface ArAvailabilityDto {
  status: 'available' | 'unavailable' | 'partial' | 'not_applicable';
  reason?: string;
}
