import { firstValueFrom, timeout } from 'rxjs';
import { type ClientGrpc } from '@nestjs/microservices';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  RackContextProvider,
  type RackContextRecord,
} from '../../application/ports/rack-context.provider';

type BatchGetRacksRequest = {
  rackIds: string[];
};

type RackSummaryMessage = {
  id: string;
  rackCode?: string;
  rack_code?: string;
  displayName?: string;
  display_name?: string;
  lifecycleState?: string;
  lifecycle_state?: string;
  capacityState?: string;
  capacity_state?: string;
  siteCode?: string;
  site_code?: string;
  roomCode?: string;
  room_code?: string;
  zoneCode?: string;
  zone_code?: string;
  rowCode?: string;
  row_code?: string;
  positionCode?: string;
  position_code?: string;
  capacityLimit?: number;
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
    this.logger.log(
      'Asset gRPC RackQueryService client initialized and ready for batch rack enrichment.',
    );
  }

  async batchGetRacks(
    rackIds: string[],
  ): Promise<Map<string, RackContextRecord>> {
    const uniqueRackIds = [
      ...new Set(
        rackIds.filter((rackId): rackId is string => isUsableRackId(rackId)),
      ),
    ];
    if (uniqueRackIds.length === 0) {
      return new Map<string, RackContextRecord>();
    }

    try {
      this.logger.debug(
        `BatchGetRacks request prepared with ${uniqueRackIds.length} rackId(s): ${uniqueRackIds.join(', ')}`,
      );

      const response = await firstValueFrom(
        this.rackQueryService
          .BatchGetRacks({ rackIds: uniqueRackIds })
          .pipe(timeout(3000)),
      );

      this.logger.debug(
        `BatchGetRacks response received with ${response.racks?.length ?? 0} rack record(s).`,
      );
      if (response.racks?.length) {
        this.logger.debug(
          `BatchGetRacks first raw rack payload: ${JSON.stringify(response.racks[0])}`,
        );
      }

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
    rackCode: rack.rackCode ?? rack.rack_code ?? rack.id,
    displayName: rack.displayName ?? rack.display_name ?? rack.id,
    lifecycleState: rack.lifecycleState ?? rack.lifecycle_state ?? 'UNKNOWN',
    capacityState: rack.capacityState ?? rack.capacity_state ?? 'UNKNOWN',
    siteCode: rack.siteCode ?? rack.site_code,
    roomCode: rack.roomCode ?? rack.room_code,
    zoneCode: rack.zoneCode ?? rack.zone_code,
    rowCode: rack.rowCode ?? rack.row_code,
    positionCode: rack.positionCode ?? rack.position_code,
    capacityLimit: rack.capacityLimit ?? rack.capacity_limit,
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

function isUsableRackId(rackId: string | null | undefined): rackId is string {
  if (typeof rackId !== 'string') {
    return false;
  }

  const normalized = rackId.trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined';
}
