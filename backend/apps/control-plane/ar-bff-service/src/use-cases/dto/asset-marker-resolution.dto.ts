export type AssetMarkerTargetType = 'rack' | 'node';

export interface AssetMarkerResolutionDto {
  marker: {
    markerCode: string;
    lifecycleState?: string;
    bindingStatus?: string;
    isActive?: boolean;
    isVisibleInAr?: boolean;
  };
  target: {
    id: string;
    type: AssetMarkerTargetType | Uppercase<AssetMarkerTargetType>;
    code: string;
    name: string;
    lifecycleState?: string;
  };
  rack?: {
    id: string;
    rackCode: string;
    displayName: string;
  };
  node?: {
    id: string;
    nodeCode: string;
    displayName: string;
  };
  topologyPath?: {
    rackId?: string;
    rackCode?: string;
  };
}
