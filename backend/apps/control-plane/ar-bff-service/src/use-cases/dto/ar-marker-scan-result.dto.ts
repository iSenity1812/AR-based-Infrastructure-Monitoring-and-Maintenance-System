export type ArAssetType = 'rack' | 'node';

export interface ArMarkerScanResultDto {
  markerCode: string;
  asset: {
    assetId: string;
    assetType: ArAssetType;
    assetCode: string;
    displayName: string;
  };
  parentRack?: {
    rackId: string;
    rackCode: string;
    displayName?: string;
  };
}
