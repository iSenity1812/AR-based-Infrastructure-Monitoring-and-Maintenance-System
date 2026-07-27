export interface AssetNodeContextRecord {
  node: {
    id: string;
    nodeCode: string;
    displayName: string;
    hostname?: string;
    rackId?: string | null;
    serialNumber?: string;
    vendor?: string;
    model?: string;
    managementIp?: string;
  };
  rack?: {
    id: string;
    rackCode: string;
    displayName: string;
    siteCode?: string;
    roomCode?: string;
  };
}

export type AssetNodeContextResult =
  | {
      kind: 'available';
      context: AssetNodeContextRecord;
    }
  | {
      kind: 'unavailable';
      reasonCode:
        | 'TIMEOUT'
        | 'NOT_FOUND'
        | 'INVALID_RESPONSE'
        | 'FORBIDDEN'
        | 'UPSTREAM_ERROR';
    };

export abstract class AssetNodeContextProvider {
  abstract getNodeContext(input: {
    nodeId: string;
    authorizationHeader: string;
    correlationId?: string;
  }): Promise<AssetNodeContextResult>;
}
