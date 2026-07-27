import type { ResolveMarkerOptions } from './asset-service-client.port';
import type {
  ArCreateWorkOrderInputDto,
  ArTicketAssetRefDto,
  ArWorkOrderSummaryDto,
} from '@use-cases/dto/ar-work-order.dto';

export abstract class IncidentWorkflowServiceClientPort {
  abstract readonly serviceName: 'incident-workflow-service';

  abstract listWorkOrders(
    assetRef: ArTicketAssetRefDto,
    options?: ResolveMarkerOptions,
  ): Promise<ArWorkOrderSummaryDto[]>;

  abstract createWorkOrder(
    input: ArCreateWorkOrderInputDto & { assetRef: ArTicketAssetRefDto },
    options?: ResolveMarkerOptions,
  ): Promise<ArWorkOrderSummaryDto>;
}
