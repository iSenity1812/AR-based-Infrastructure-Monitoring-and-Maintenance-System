import type { NodeContext } from '../types';
import { requestApiData } from './api-client';

type MarkerResolution = {
  target: {
    id: string;
    type: 'node' | 'rack' | string;
    code: string;
    name: string;
  };
  node?: {
    id: string;
    nodeCode: string;
    displayName: string;
  };
  rack?: {
    id: string;
    rackCode: string;
    displayName: string;
  };
};

export async function resolveAssetMarker(
  apiBaseUrl: string,
  markerCode: string,
  token: string,
  fallback: NodeContext,
  signal?: AbortSignal,
): Promise<NodeContext> {
  const baseUrl = apiBaseUrl.trim().replace(/\/$/, '');
  const resolution = await requestApiData<MarkerResolution>(
    `${baseUrl}/markers/resolve/${encodeURIComponent(markerCode)}`,
    token,
    signal,
  );

  if (resolution.target.type === 'rack' && resolution.rack) {
    return {
      ...fallback,
      assetType: 'rack',
      id: resolution.rack.rackCode,
      name: resolution.rack.displayName || resolution.rack.rackCode,
      rack: resolution.rack.displayName || resolution.rack.rackCode,
      status: 'nominal',
      temperatureC: null,
      cpuPercent: null,
      memoryPercent: null,
      diskPercent: null,
      networkRxBytesSec: null,
      networkTxBytesSec: null,
      activeTicketCount: 0,
      lastTicketCode: 'N/A',
      updatedAt: 'Rack marker resolved',
    };
  }

  if (resolution.target.type !== 'node' || !resolution.node) {
    throw new Error(`Marker ${markerCode} is not mapped to a supported asset.`);
  }

  return {
    ...fallback,
    assetType: 'node',
    id: resolution.node.nodeCode,
    name: resolution.node.displayName || resolution.node.nodeCode,
    rack:
      resolution.rack?.displayName ||
      resolution.rack?.rackCode ||
      fallback.rack,
    updatedAt: 'Marker resolved',
  };
}
