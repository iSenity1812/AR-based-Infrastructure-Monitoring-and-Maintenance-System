import { Inject, Injectable } from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import {
  ASSET_SERVICE_CLIENT,
  MONITORING_SERVICE_CLIENT,
} from '@application/ports/client.tokens';
import { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import type { ArAssetType } from '@use-cases/dto/ar-asset.dto';
import type { ArAssetOverviewDto } from '@use-cases/dto/ar-asset-overview.dto';
import { toArBlockingException } from './ar-use-case-errors';

@Injectable()
export class GetArAssetOverviewUseCase {
  constructor(
    @Inject(ASSET_SERVICE_CLIENT)
    private readonly assetServiceClient: AssetServiceClientPort,
    @Inject(MONITORING_SERVICE_CLIENT)
    private readonly monitoringServiceClient: MonitoringServiceClientPort,
  ) {}

  async execute(
    assetType: ArAssetType,
    assetCode: string,
    options: ResolveMarkerOptions = {},
  ): Promise<ArAssetOverviewDto> {
    try {
      const asset = await this.assetServiceClient.resolveAsset(
        assetType,
        assetCode,
        options,
      );

      try {
        const summary = await this.monitoringServiceClient.getAssetOverview(
          asset,
          options,
        );

        return {
          asset,
          monitoring: {
            availability: { status: 'available' },
            summary,
          },
        };
      } catch (error) {
        if (
          error instanceof DownstreamServiceError &&
          error.serviceName === 'monitoring-service'
        ) {
          return {
            asset,
            monitoring: {
              availability: {
                status: 'unavailable',
                reason: error.message,
              },
            },
          };
        }

        throw error;
      }
    } catch (error) {
      if (
        error instanceof DownstreamServiceError &&
        error.serviceName === 'asset-service'
      ) {
        throw toArBlockingException(error);
      }

      throw error;
    }
  }
}
