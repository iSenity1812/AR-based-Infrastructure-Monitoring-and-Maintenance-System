import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DownstreamServiceError } from '@application/errors/downstream-service.error';
import { AssetServiceClientPort } from '@application/ports/asset-service-client.port';
import type { ResolveMarkerOptions } from '@application/ports/asset-service-client.port';
import {
  ASSET_SERVICE_CLIENT,
  INCIDENT_WORKFLOW_SERVICE_CLIENT,
} from '@application/ports/client.tokens';
import { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import type { ArAssetType } from '@use-cases/dto/ar-asset.dto';
import type {
  ArTicketAssetRefDto,
  ArWorkOrderListDto,
} from '@use-cases/dto/ar-work-order.dto';
import { toArBlockingException } from './ar-use-case-errors';

@Injectable()
export class ListArWorkOrdersUseCase {
  constructor(
    @Inject(ASSET_SERVICE_CLIENT)
    private readonly assetServiceClient: AssetServiceClientPort,
    @Inject(INCIDENT_WORKFLOW_SERVICE_CLIENT)
    private readonly incidentWorkflowServiceClient: IncidentWorkflowServiceClientPort,
  ) {}

  async execute(
    assetType: ArAssetType,
    assetId: string,
    options: ResolveMarkerOptions = {},
  ): Promise<ArWorkOrderListDto> {
    try {
      const asset = await this.assetServiceClient.resolveAssetById(
        assetType,
        assetId,
        options,
      );
      const assetRef = toAssetRef(asset);

      try {
        const workOrders =
          await this.incidentWorkflowServiceClient.listWorkOrders(
            assetRef,
            options,
          );

        return {
          asset,
          availability: { status: 'available' },
          workOrders,
        };
      } catch (error) {
        if (
          error instanceof DownstreamServiceError &&
          error.serviceName === 'incident-workflow-service'
        ) {
          throw new ServiceUnavailableException({
            code: 'incident-workflow-service.unavailable',
            message: error.message,
          });
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

export function toAssetRef(asset: {
  assetType: ArAssetType;
  assetId: string;
  assetCode: string;
  displayName: string;
  parentRack?: { rackId: string; rackCode: string };
}): ArTicketAssetRefDto {
  return {
    type: asset.assetType,
    assetId: asset.assetId,
    code: asset.assetCode,
    displayName: asset.displayName,
    rackId: asset.parentRack?.rackId,
    rackCode: asset.parentRack?.rackCode,
  };
}
