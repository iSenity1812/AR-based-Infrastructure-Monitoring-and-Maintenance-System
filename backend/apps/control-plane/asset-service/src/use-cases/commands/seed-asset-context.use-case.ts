import { Inject, Injectable } from '@nestjs/common';

import {
  MARKER_REPOSITORY,
  NODE_REPOSITORY,
  NODE_RUNTIME_SNAPSHOT_REPOSITORY,
  RACK_REPOSITORY,
} from '@domain/ports/port.tokens';
import { MarkerTargetType } from '@domain/constants/marker-target-type.enum';
import type {
  MarkerRepositoryPort,
  NodeRepositoryPort,
  NodeRuntimeSnapshotRepositoryPort,
  RackRepositoryPort,
} from '@domain/ports/repositories.port';
import { assetContextSeedFixture } from '@use-cases/commands/seed-asset-context.fixture';
import { AssetContextReadService } from '@use-cases/services/asset-context-read.service';

@Injectable()
export class SeedAssetContextUseCase {
  constructor(
    @Inject(RACK_REPOSITORY)
    private readonly rackRepository: RackRepositoryPort,
    @Inject(NODE_REPOSITORY)
    private readonly nodeRepository: NodeRepositoryPort,
    @Inject(MARKER_REPOSITORY)
    private readonly markerRepository: MarkerRepositoryPort,
    @Inject(NODE_RUNTIME_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: NodeRuntimeSnapshotRepositoryPort,
    private readonly assetContextReadService: AssetContextReadService,
  ) {}

  async execute() {
    const racksByCode = new Map<string, string>();
    const nodesByCode = new Map<string, string>();

    for (const rack of assetContextSeedFixture.racks) {
      const existing = await this.rackRepository.findByCode(rack.rackCode);
      const persisted = existing
        ? await this.rackRepository.update(existing.id, rack)
        : await this.rackRepository.create(rack);

      if (persisted) {
        racksByCode.set(rack.rackCode, persisted.id);
      }
    }

    for (const node of assetContextSeedFixture.nodes) {
      const rackId = node.rackCode ? racksByCode.get(node.rackCode) : undefined;
      const payload = {
        ...node,
        rackId,
      };
      delete (payload as Record<string, unknown>).rackCode;

      const existing = await this.nodeRepository.findByCode(node.nodeCode);
      const persisted = existing
        ? await this.nodeRepository.update(existing.id, payload)
        : await this.nodeRepository.create(payload);

      if (persisted) {
        nodesByCode.set(node.nodeCode, persisted.id);
      }
    }

    for (const marker of assetContextSeedFixture.markers) {
      const targetId =
        marker.targetType === MarkerTargetType.RACK
          ? racksByCode.get(marker.targetCode)
          : nodesByCode.get(marker.targetCode);

      const payload = {
        ...marker,
        targetId,
      };
      delete (payload as Record<string, unknown>).targetCode;

      const existing = await this.markerRepository.findByCode(
        marker.markerCode,
      );
      if (existing) {
        await this.markerRepository.update(existing.id, payload);
      } else {
        await this.markerRepository.create(payload);
      }
    }

    for (const snapshot of assetContextSeedFixture.nodeRuntimeSnapshots) {
      const nodeId = nodesByCode.get(snapshot.nodeCode);
      if (!nodeId) {
        continue;
      }

      const payload = {
        ...snapshot,
        nodeId,
      };
      delete (payload as Record<string, unknown>).nodeCode;
      await this.snapshotRepository.upsert(payload);
    }

    await Promise.all(
      Array.from(racksByCode.values()).map((rackId) =>
        this.assetContextReadService.invalidateRackTopology(rackId),
      ),
    );
    await Promise.all(
      Array.from(nodesByCode.values()).map((nodeId) =>
        this.assetContextReadService.invalidateNodeContext(nodeId),
      ),
    );
    await Promise.all(
      assetContextSeedFixture.markers.map((marker) =>
        this.assetContextReadService.invalidateMarkerResolution(
          marker.markerCode,
        ),
      ),
    );

    return {
      message:
        'Asset context seed completed. Workload runtime inventory is not seeded in asset-service.',
      counts: {
        racks: assetContextSeedFixture.racks.length,
        nodes: assetContextSeedFixture.nodes.length,
        markers: assetContextSeedFixture.markers.length,
        nodeRuntimeSnapshots:
          assetContextSeedFixture.nodeRuntimeSnapshots.length,
      },
    };
  }
}
