import {
  BadGatewayException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { AssetServiceClientError } from '@application/errors/asset-service-client.error';
import { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import { ASSET_SERVICE_CLIENT } from '@application/ports/client.tokens';
import type { AssetMarkerResolutionDto } from '@use-cases/dto/asset-marker-resolution.dto';
import type {
  ArAssetType,
  ArMarkerScanResultDto,
} from '@use-cases/dto/ar-marker-scan-result.dto';

@Injectable()
export class ScanMarkerUseCase {
  constructor(
    @Inject(ASSET_SERVICE_CLIENT)
    private readonly assetServiceClient: AssetServiceClientPort,
  ) {}

  async execute(
    markerCode: string,
    options: ResolveMarkerOptions = {},
  ): Promise<ArMarkerScanResultDto> {
    try {
      const resolution = await this.assetServiceClient.resolveMarker(
        markerCode,
        options,
      );

      return this.normalizeResolution(resolution);
    } catch (error) {
      if (error instanceof AssetServiceClientError) {
        throw this.toArException(error);
      }

      throw error;
    }
  }

  private normalizeResolution(
    resolution: AssetMarkerResolutionDto,
  ): ArMarkerScanResultDto {
    this.assertMarkerCanBeScanned(resolution);

    const assetType = this.normalizeAssetType(resolution.target.type);
    const result: ArMarkerScanResultDto = {
      markerCode: resolution.marker.markerCode,
      asset: {
        assetId: resolution.target.id,
        assetType,
        assetCode: resolution.target.code,
        displayName: resolution.target.name,
      },
    };

    if (assetType === 'node') {
      const rackId = resolution.rack?.id ?? resolution.topologyPath?.rackId;
      const rackCode =
        resolution.rack?.rackCode ?? resolution.topologyPath?.rackCode;

      if (rackId && rackCode) {
        result.parentRack = {
          rackId,
          rackCode,
          displayName: resolution.rack?.displayName,
        };
      }
    }

    return result;
  }

  private assertMarkerCanBeScanned(resolution: AssetMarkerResolutionDto): void {
    if (resolution.marker.isActive === false) {
      throw new GoneException({
        code: 'MARKER_NOT_ACTIVE',
        message: 'Marker is not active for AR scanning.',
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

    if (!resolution.marker.markerCode || !resolution.target.id) {
      throw new BadGatewayException({
        code: 'MARKER_TARGET_INVALID',
        message: 'Asset Service returned an invalid marker target.',
      });
    }
  }

  private normalizeAssetType(type: string): ArAssetType {
    const normalized = type.toLowerCase();

    if (normalized === 'rack' || normalized === 'node') {
      return normalized;
    }

    throw new BadGatewayException({
      code: 'MARKER_TARGET_INVALID',
      message: `Unsupported AR marker target type: ${type}.`,
    });
  }

  private toArException(error: AssetServiceClientError): Error {
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
