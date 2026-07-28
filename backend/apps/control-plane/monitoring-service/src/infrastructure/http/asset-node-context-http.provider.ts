import { Injectable } from '@nestjs/common';

import {
  AssetNodeContextProvider,
  type AssetNodeContextRecord,
  type AssetNodeContextResult,
} from '../../application/ports/asset-node-context.provider';
import { MonitoringServiceConfig } from '../config/monitoring-service-config';

@Injectable()
export class AssetNodeContextHttpProvider implements AssetNodeContextProvider {
  constructor(private readonly config: MonitoringServiceConfig) {}

  async getNodeContext(input: {
    nodeId: string;
    authorizationHeader: string;
    correlationId?: string;
  }): Promise<AssetNodeContextResult> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.assetServiceTimeoutMs,
    );

    try {
      const response = await fetch(
        `${this.config.assetServiceBaseUrl}/nodes/${encodeURIComponent(input.nodeId)}/context`,
        {
          method: 'GET',
          signal: controller.signal,
          headers: {
            authorization: input.authorizationHeader,
            ...(input.correlationId
              ? { 'x-correlation-id': input.correlationId }
              : {}),
          },
        },
      );

      if (response.status === 404) {
        return { kind: 'unavailable', reasonCode: 'NOT_FOUND' };
      }

      if (response.status === 401 || response.status === 403) {
        return { kind: 'unavailable', reasonCode: 'FORBIDDEN' };
      }

      if (!response.ok) {
        return { kind: 'unavailable', reasonCode: 'UPSTREAM_ERROR' };
      }

      const parsed = parseNodeContextEnvelope(await response.json());
      if (!parsed) {
        return { kind: 'unavailable', reasonCode: 'INVALID_RESPONSE' };
      }

      return {
        kind: 'available',
        context: parsed,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { kind: 'unavailable', reasonCode: 'TIMEOUT' };
      }

      return { kind: 'unavailable', reasonCode: 'UPSTREAM_ERROR' };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseNodeContextEnvelope(input: unknown): AssetNodeContextRecord | null {
  const payload =
    isRecord(input) && isRecord(input.data) ? input.data : input;

  if (!isRecord(payload) || !isRecord(payload.node)) {
    return null;
  }

  const nodeId = readString(payload.node.id);
  const nodeCode = readString(payload.node.nodeCode);
  const displayName = readString(payload.node.displayName);

  if (!nodeId || !nodeCode || !displayName) {
    return null;
  }

  return {
    node: {
      id: nodeId,
      nodeCode,
      displayName,
      hostname: readString(payload.node.hostname) ?? undefined,
      rackId: readString(payload.node.rackId) ?? undefined,
      serialNumber: readString(payload.node.serialNumber) ?? undefined,
      vendor: readString(payload.node.vendor) ?? undefined,
      model: readString(payload.node.model) ?? undefined,
      managementIp: readString(payload.node.managementIp) ?? undefined,
    },
    rack: isRecord(payload.rack)
      ? parseRack(payload.rack)
      : undefined,
  };
}

function parseRack(input: Record<string, unknown>) {
  const rackId = readString(input.id);
  const rackCode = readString(input.rackCode);
  const displayName = readString(input.displayName);

  if (!rackId || !rackCode || !displayName) {
    return undefined;
  }

  return {
    id: rackId,
    rackCode,
    displayName,
    siteCode: readString(input.siteCode) ?? undefined,
    roomCode: readString(input.roomCode) ?? undefined,
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input && typeof input === 'object' && !Array.isArray(input));
}

function readString(input: unknown): string | null {
  return typeof input === 'string' && input.trim() ? input.trim() : null;
}
