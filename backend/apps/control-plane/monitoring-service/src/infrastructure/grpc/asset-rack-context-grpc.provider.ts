import { firstValueFrom, timeout } from 'rxjs';
import { type ClientGrpc } from '@nestjs/microservices';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import {
  RackContextProvider,
  type RackContextRecord,
} from '../../application/ports/rack-context.provider';

type BatchGetRacksRequest = {
  rack_ids: string[];
};

type RackSummaryMessage = {
  id: string;
  rack_code: string;
  display_name: string;
  lifecycle_state: string;
  capacity_state: string;
  site_code?: string;
  room_code?: string;
  zone_code?: string;
  row_code?: string;
  position_code?: string;
  capacity_limit?: number;
  notes?: string;
  vendor?: string;
  metadata?: Record<string, unknown> | null;
};

type BatchGetRacksResponse = {
  racks: RackSummaryMessage[];
};

type RackQueryServiceClient = {
  BatchGetRacks(
    request: BatchGetRacksRequest,
  ): import('rxjs').Observable<BatchGetRacksResponse>;
};

@Injectable()
export class AssetRackContextGrpcProvider
  implements RackContextProvider, OnModuleInit
{
  private readonly logger = new Logger(AssetRackContextGrpcProvider.name);

  private rackQueryService!: RackQueryServiceClient;

  constructor(
    @Inject('ASSET_SERVICE_GRPC')
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.rackQueryService =
      this.grpcClient.getService<RackQueryServiceClient>('RackQueryService');
  }

  async batchGetRacks(
    rackIds: string[],
  ): Promise<Map<string, RackContextRecord>> {
    const uniqueRackIds = [...new Set(rackIds.filter((rackId) => rackId.trim()))];
    if (uniqueRackIds.length === 0) {
      return new Map<string, RackContextRecord>();
    }

    try {
      const response = await firstValueFrom(
        this.rackQueryService
          .BatchGetRacks({ rack_ids: uniqueRackIds })
          .pipe(timeout(3000)),
      );

      return new Map(
        (response.racks ?? []).map((rack) => [rack.id, mapRackSummary(rack)]),
      );
    } catch (error) {
      this.logger.warn(
        `Asset rack context enrichment unavailable. Falling back to rack_id labels. Reason: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return new Map<string, RackContextRecord>();
    }
  }
}

function mapRackSummary(rack: RackSummaryMessage): RackContextRecord {
  return {
    id: rack.id,
    rackCode: rack.rack_code,
    displayName: rack.display_name,
    lifecycleState: rack.lifecycle_state,
    capacityState: rack.capacity_state,
    siteCode: rack.site_code,
    roomCode: rack.room_code,
    zoneCode: rack.zone_code,
    rowCode: rack.row_code,
    positionCode: rack.position_code,
    capacityLimit: rack.capacity_limit,
    notes: rack.notes,
    vendor: rack.vendor,
    metadata: normalizeMetadata(rack.metadata),
  };
}

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}
