import { Injectable } from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import type { ArResolvedAssetDto } from '@use-cases/dto/ar-asset.dto';

@Injectable()
export class MonitoringServiceHttpClient implements MonitoringServiceClientPort {
  readonly serviceName = 'monitoring-service' as const;

  constructor(private readonly config: ArBffServiceConfig) {}

  async getAssetOverview(
    asset: ArResolvedAssetDto,
    options: ResolveMarkerOptions = {},
  ): Promise<unknown> {
    const path =
      asset.assetType === 'rack'
        ? `/monitoring/racks/${encodeURIComponent(asset.assetId)}/overview`
        : `/monitoring/nodes/${encodeURIComponent(asset.assetId)}/overview`;
    const response = await this.fetchJson(path, options);

    return unwrapData(response);
  }

  private async fetchJson(
    path: string,
    options: ResolveMarkerOptions,
  ): Promise<unknown> {
    try {
      const response = await fetch(
        `${this.config.monitoringServiceBaseUrl}${path}`,
        {
          method: 'GET',
          headers: buildHeaders(options),
        },
      );

      if (!response.ok) {
        throw new DownstreamServiceError(
          'monitoring-service',
          response.status >= 500 ? 'UNAVAILABLE' : 'NOT_FOUND',
          'Monitoring Service could not provide AR overview data.',
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof DownstreamServiceError) {
        throw error;
      }

      throw new DownstreamServiceError(
        'monitoring-service',
        'UNAVAILABLE',
        'Monitoring Service is unavailable.',
      );
    }
  }
}

function buildHeaders(options: ResolveMarkerOptions): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.authorization) headers.Authorization = options.authorization;
  if (options.requestId) headers['x-request-id'] = options.requestId;
  if (options.correlationId)
    headers['x-correlation-id'] = options.correlationId;

  return headers;
}

function unwrapData(response: unknown): unknown {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response;
}
