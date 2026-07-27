import {
  BadRequestException,
  BadGatewayException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import {
  ASSET_SERVICE_CLIENT,
  INCIDENT_WORKFLOW_SERVICE_CLIENT,
  MONITORING_SERVICE_CLIENT,
} from '@application/ports/client.tokens';
import { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import type { ArResolvedAssetDto } from '@use-cases/dto/ar-asset.dto';
import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';
import type {
  ArOverlayDto,
  ArOverlayInputDto,
} from '@use-cases/dto/ar-overlay.dto';
import { toArBlockingException } from './ar-use-case-errors';
import { toAssetRef } from './list-ar-work-orders.use-case';

@Injectable()
export class GetArOverlayUseCase {
  constructor(
    @Inject(ASSET_SERVICE_CLIENT)
    private readonly assetServiceClient: AssetServiceClientPort,
    @Inject(MONITORING_SERVICE_CLIENT)
    private readonly monitoringServiceClient: MonitoringServiceClientPort,
    @Inject(INCIDENT_WORKFLOW_SERVICE_CLIENT)
    private readonly incidentWorkflowServiceClient: IncidentWorkflowServiceClientPort,
  ) {}

  async execute(
    input: ArOverlayInputDto,
    options: ResolveMarkerOptions = {},
  ): Promise<ArOverlayDto> {
    const { asset, markerCode } = await this.resolveOverlayAnchor(
      input,
      options,
    );
    const [monitoring, workOrders] = await Promise.all([
      this.readMonitoring(asset, options),
      this.readWorkOrders(asset, options),
    ]);

    return {
      source: {
        markerCode,
        assetCode: asset.assetCode,
      },
      asset,
      monitoring,
      workOrders,
    };
  }

  private async resolveOverlayAnchor(
    input: ArOverlayInputDto,
    options: ResolveMarkerOptions,
  ): Promise<{ asset: ArResolvedAssetDto; markerCode?: string }> {
    try {
      if (input.markerCode) {
        const resolution = await this.assetServiceClient.resolveMarker(
          input.markerCode,
          options,
        );

        return {
          markerCode: resolution.marker.markerCode,
          asset: this.toResolvedAsset(resolution),
        };
      }

      if (input.asset) {
        return {
          asset: await this.assetServiceClient.resolveAsset(
            input.asset.assetType,
            input.asset.assetCode,
            options,
          ),
        };
      }
    } catch (error) {
      if (error instanceof AssetServiceClientError) {
        throw this.toAssetBlockingException(error);
      }

      if (
        error instanceof DownstreamServiceError &&
        error.serviceName === 'asset-service'
      ) {
        throw toArBlockingException(error);
      }

      throw error;
    }

    throw new BadRequestException({
      code: 'AR_OVERLAY_ANCHOR_REQUIRED',
      message: 'Provide markerCode or asset to compose an AR overlay.',
    });
  }

  private async readMonitoring(
    asset: ArResolvedAssetDto,
    options: ResolveMarkerOptions,
  ): Promise<ArOverlayDto['monitoring']> {
    try {
      return {
        availability: { status: 'available' },
        summary: await this.monitoringServiceClient.getAssetOverview(
          asset,
          options,
        ),
      };
    } catch (error) {
      if (
        error instanceof DownstreamServiceError &&
        error.serviceName === 'monitoring-service'
      ) {
        return {
          availability: {
            status: 'unavailable',
            reason: error.message,
          },
        };
      }

      throw error;
    }
  }

  private async readWorkOrders(
    asset: ArResolvedAssetDto,
    options: ResolveMarkerOptions,
  ): Promise<ArOverlayDto['workOrders']> {
    try {
      return {
        availability: { status: 'available' },
        items: await this.incidentWorkflowServiceClient.listWorkOrders(
          toAssetRef(asset),
          options,
        ),
      };
    } catch (error) {
      if (
        error instanceof DownstreamServiceError &&
        error.serviceName === 'incident-workflow-service'
      ) {
        return {
          availability: {
            status: 'unavailable',
            reason: error.message,
          },
          items: [],
        };
      }

      throw error;
    }
  }

  private toResolvedAsset(
    resolution: AssetMarkerResolutionDto,
  ): ArResolvedAssetDto {
    this.assertMarkerCanAnchorOverlay(resolution);

    const assetType = resolution.target.type.toLowerCase();
    if (assetType !== 'rack' && assetType !== 'node') {
      throw new BadGatewayException({
        code: 'MARKER_TARGET_INVALID',
        message: `Unsupported AR marker target type: ${resolution.target.type}.`,
      });
    }

    const asset: ArResolvedAssetDto = {
      assetId: resolution.target.id,
      assetType,
      assetCode: resolution.target.code,
      displayName: resolution.target.name,
    };

    if (assetType === 'node') {
      const rackId = resolution.rack?.id ?? resolution.topologyPath?.rackId;
      const rackCode =
        resolution.rack?.rackCode ?? resolution.topologyPath?.rackCode;

      if (rackId && rackCode) {
        asset.parentRack = {
          rackId,
          rackCode,
          displayName: resolution.rack?.displayName,
        };
      }
    }

    return asset;
  }

  private assertMarkerCanAnchorOverlay(
    resolution: AssetMarkerResolutionDto,
  ): void {
    if (resolution.marker.isActive === false) {
      throw new GoneException({
        code: 'MARKER_NOT_ACTIVE',
        message: 'Marker is not active for AR overlay composition.',
      });
    }

    if (
      resolution.marker.lifecycleState === 'RETIRED' ||
      resolution.target.lifecycleState === 'RETIRED'
    ) {
      throw new GoneException({
        code: 'MARKER_RETIRED',
        message: 'Marker or mapped asset is retired.',
      });
    }
  }

  private toAssetBlockingException(error: AssetServiceClientError): Error {
    switch (error.reason) {
      case 'MARKER_NOT_FOUND':
        return new NotFoundException({
          code: 'MARKER_NOT_FOUND',
          message: error.message,
        });
      case 'MARKER_NOT_ACTIVE':
      case 'MARKER_UNMOUNTED':
        return new GoneException({
          code: error.reason,
          message: error.message,
        });
      case 'MARKER_TARGET_INVALID':
        return new BadGatewayException({
          code: 'MARKER_TARGET_INVALID',
          message: error.message,
        });
      case 'ASSET_SERVICE_UNAVAILABLE':
        return new ServiceUnavailableException({
          code: 'ASSET_SERVICE_UNAVAILABLE',
          message: error.message,
        });
    }
  }
}
