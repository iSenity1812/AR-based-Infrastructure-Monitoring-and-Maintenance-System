import { Injectable } from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import {
  AssetServiceClientPort,
  type ResolveMarkerOptions,
} from '@application/ports/asset-service-client.port';
import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';

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

  private async fetchMarkerResolution(
    markerCode: string,
    options: ResolveMarkerOptions,
  ): Promise<Response> {
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

    try {
      return await fetch(
        `${this.config.assetServiceBaseUrl}/markers/resolve/${encodeURIComponent(markerCode)}`,
        { method: 'GET', headers },
      );
    } catch {
      throw new AssetServiceClientError(
        'ASSET_SERVICE_UNAVAILABLE',
        'Asset Service is unavailable.',
      );
    }
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
