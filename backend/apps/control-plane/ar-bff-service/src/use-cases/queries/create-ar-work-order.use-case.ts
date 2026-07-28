import { Inject, Injectable } from '@nestjs/common';

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
  ArCreateWorkOrderInputDto,
  ArCreateWorkOrderResultDto,
} from '@use-cases/dto/ar-work-order.dto';
import { toArBlockingException } from './ar-use-case-errors';
import { toAssetRef } from './list-ar-work-orders.use-case';

@Injectable()
export class CreateArWorkOrderUseCase {
  constructor(
    @Inject(ASSET_SERVICE_CLIENT)
    private readonly assetServiceClient: AssetServiceClientPort,
    @Inject(INCIDENT_WORKFLOW_SERVICE_CLIENT)
    private readonly incidentWorkflowServiceClient: IncidentWorkflowServiceClientPort,
  ) {}

  async execute(
    assetType: ArAssetType,
    assetId: string,
    input: ArCreateWorkOrderInputDto,
    options: ResolveMarkerOptions = {},
  ): Promise<ArCreateWorkOrderResultDto> {
    try {
      const asset = await this.assetServiceClient.resolveAssetById(
        assetType,
        assetId,
        options,
      );
      const workOrder =
        await this.incidentWorkflowServiceClient.createWorkOrder(
          {
            ...input,
            assetRef: toAssetRef(asset),
          },
          options,
        );

      return {
        asset,
        workOrder,
      };
    } catch (error) {
      if (error instanceof DownstreamServiceError) {
        throw toArBlockingException(error);
      }

      throw error;
    }
  }
}
