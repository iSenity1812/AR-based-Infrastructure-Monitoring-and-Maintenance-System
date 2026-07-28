import { Injectable } from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import {
  AssetServiceClientPort,
  type ResolveMarkerOptions,
} from '@application/ports/asset-service-client.port';
import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import type {
  ArAssetType,
  ArResolvedAssetDto,
} from '@use-cases/dto/ar-asset.dto';
import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';
import { DownstreamServiceError } from '@application/errors/downstream-service.error';

interface AssetServiceEnvelope<TData> {
  data?: TData;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

@Injectable()
export class AssetServiceHttpClient implements AssetServiceClientPort {
  readonly serviceName = 'asset-service' as const;

  constructor(private readonly config: ArBffServiceConfig) {}

  async resolveMarker(
    markerCode: string,
    options: ResolveMarkerOptions = {},
  ): Promise<AssetMarkerResolutionDto> {
    const response = await this.fetchMarkerResolution(markerCode, options);
    const body = await this.readEnvelope<AssetMarkerResolutionDto>(response);

    if (!response.ok) {
      throw this.toClientError(response.status, body);
    }

    if (!body.data) {
      throw new AssetServiceClientError(
        'MARKER_TARGET_INVALID',
        'Asset Service returned an empty marker resolution.',
      );
    }

    return body.data;
  }

  async resolveAssetById(
    assetType: ArAssetType,
    assetId: string,
    options: ResolveMarkerOptions = {},
  ): Promise<ArResolvedAssetDto> {
    const response = await this.fetchAssetById(assetType, assetId, options);
    return this.readResolvedAsset(response, assetType, assetId, options);
  }

  async resolveAssetByCode(
    assetType: ArAssetType,
    assetCode: string,
    options: ResolveMarkerOptions = {},
  ): Promise<ArResolvedAssetDto> {
    const response = await this.fetchAssetByCode(assetCode, options);
    return this.readResolvedAsset(response, assetType, assetCode, options);
  }

  private async readResolvedAsset(
    response: Response,
    assetType: ArAssetType,
    assetIdentifier: string,
    options: ResolveMarkerOptions,
  ): Promise<ArResolvedAssetDto> {
    const body = await this.readEnvelope<{
      id: string;
      type: string;
      code: string;
      name: string;
    }>(response);

    if (!response.ok || !body.data) {
      throw new DownstreamServiceError(
        'asset-service',
        response.status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE',
        `Asset ${assetIdentifier} was not found.`,
      );
    }

    const normalizedType = body.data.type.toLowerCase();
    if (normalizedType !== assetType) {
      throw new DownstreamServiceError(
        'asset-service',
        'NOT_FOUND',
        `Asset ${assetIdentifier} is not a ${assetType}.`,
      );
    }

    const asset: ArResolvedAssetDto = {
      assetId: body.data.id,
      assetType,
      assetCode: body.data.code,
      displayName: body.data.name,
    };

    if (assetType === 'node') {
      asset.parentRack = await this.resolveNodeParentRack(
        asset.assetId,
        options,
      );
    }

    return asset;
  }

  private async fetchMarkerResolution(
    markerCode: string,
    options: ResolveMarkerOptions,
  ): Promise<Response> {
    try {
      return await fetch(
        `${this.config.assetServiceBaseUrl}/markers/resolve/${encodeURIComponent(markerCode)}`,
        { method: 'GET', headers: this.buildHeaders(options) },
      );
    } catch {
      throw new AssetServiceClientError(
        'ASSET_SERVICE_UNAVAILABLE',
        'Asset Service is unavailable.',
      );
    }
  }

  private async fetchAssetById(
    assetType: ArAssetType,
    assetId: string,
    options: ResolveMarkerOptions,
  ): Promise<Response> {
    return this.fetchAssetService(
      `/assets/${encodeURIComponent(assetType)}/${encodeURIComponent(assetId)}`,
      options,
    );
  }

  private async fetchAssetByCode(
    assetCode: string,
    options: ResolveMarkerOptions,
  ): Promise<Response> {
    return this.fetchAssetService(
      `/assets/by-code/${encodeURIComponent(assetCode)}`,
      options,
    );
  }

  private async resolveNodeParentRack(
    nodeId: string,
    options: ResolveMarkerOptions,
  ): Promise<ArResolvedAssetDto['parentRack']> {
    try {
      const response = await this.fetchAssetService(
        `/nodes/${encodeURIComponent(nodeId)}/context`,
        options,
      );
      const body = await this.readEnvelope<{
        rack?: { id: string; rackCode: string; displayName?: string };
        topologyPath?: { rackId?: string; rackCode?: string };
      }>(response);
      const rackId = body.data?.rack?.id ?? body.data?.topologyPath?.rackId;
      const rackCode =
        body.data?.rack?.rackCode ?? body.data?.topologyPath?.rackCode;

      return rackId && rackCode
        ? {
            rackId,
            rackCode,
            displayName: body.data?.rack?.displayName,
          }
        : undefined;
    } catch {
      return undefined;
    }
  }

  private async fetchAssetService(
    path: string,
    options: ResolveMarkerOptions,
  ): Promise<Response> {
    try {
      return await fetch(`${this.config.assetServiceBaseUrl}${path}`, {
        method: 'GET',
        headers: this.buildHeaders(options),
      });
    } catch {
      throw new DownstreamServiceError(
        'asset-service',
        'UNAVAILABLE',
        'Asset Service is unavailable.',
      );
    }
  }

  private buildHeaders(options: ResolveMarkerOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.authorization) {
      headers.Authorization = options.authorization;
    }

    if (options.requestId) {
      headers['x-request-id'] = options.requestId;
    }

    if (options.correlationId) {
      headers['x-correlation-id'] = options.correlationId;
    }

    return headers;
  }

  private async readEnvelope<TData>(
    response: Response,
  ): Promise<AssetServiceEnvelope<TData>> {
    try {
      const body = (await response.json()) as AssetServiceEnvelope<TData>;
      return body.data || body.error ? body : { data: body as TData };
    } catch {
      return {};
    }
  }

  private toClientError(
    status: number,
    body: AssetServiceEnvelope<unknown>,
  ): AssetServiceClientError {
    if (status >= 500) {
      return new AssetServiceClientError(
        'ASSET_SERVICE_UNAVAILABLE',
        'Asset Service is unavailable.',
      );
    }

    const downstreamCode = body.error?.code;
    const message =
      body.error?.message ?? body.message ?? 'Marker scan could not resolve.';

    if (status === 404 || downstreamCode === 'ASSET_MARKER_NOT_FOUND') {
      return new AssetServiceClientError('MARKER_NOT_FOUND', message);
    }

    if (downstreamCode === 'ASSET_MARKER_TARGET_INVALID') {
      return new AssetServiceClientError('MARKER_TARGET_INVALID', message);
    }

    if (
      downstreamCode === 'ASSET_MARKER_NOT_ACTIVE' ||
      downstreamCode === 'ASSET_MARKER_RETIRED'
    ) {
      return new AssetServiceClientError('MARKER_NOT_ACTIVE', message);
    }

    if (downstreamCode === 'ASSET_MARKER_UNMOUNTED') {
      return new AssetServiceClientError('MARKER_UNMOUNTED', message);
    }

    return new AssetServiceClientError('MARKER_TARGET_INVALID', message);
  }
}
