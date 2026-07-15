import { Inject, Injectable, Logger } from '@nestjs/common';

import { mapNodeOverviewToRealtimeEvent } from '../mappers/node-overview-realtime-event.mapper';
import { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import { NodeOverviewReadRepository } from '../ports/node-overview-read.repository';
import {
  NodeOverviewComposerService,
  type NodeOverviewResponseView,
} from '../services/node-overview-composer.service';

export interface SyncNodeOverviewRealtimeResult {
  emittedEvents: number;
  changedNodeIds: number;
  nextCheckpointSummaryTs: string | null;
  initialized: boolean;
}

@Injectable()
export class SyncNodeOverviewRealtimeUseCase {
  private readonly logger = new Logger(SyncNodeOverviewRealtimeUseCase.name);
  private checkpointSummaryTs: string | null = null;
  private readonly fingerprintsByNodeId = new Map<string, string>();

  constructor(
    @Inject(NodeOverviewReadRepository)
    private readonly nodeOverviewReadRepository: NodeOverviewReadRepository,
    private readonly nodeOverviewComposerService: NodeOverviewComposerService,
    @Inject(MonitoringRealtimePort)
    private readonly monitoringRealtimePort: MonitoringRealtimePort,
  ) {}

  async execute(): Promise<SyncNodeOverviewRealtimeResult> {
    if (!this.checkpointSummaryTs) {
      this.checkpointSummaryTs =
        await this.nodeOverviewReadRepository.getLatestNodeChangeSummaryTs();

      return {
        emittedEvents: 0,
        changedNodeIds: 0,
        nextCheckpointSummaryTs: this.checkpointSummaryTs,
        initialized: true,
      };
    }

    const changedNodeIds =
      await this.nodeOverviewReadRepository.listChangedNodeIdsSince(
        this.checkpointSummaryTs,
      );

    let emittedEvents = 0;
    for (const nodeId of changedNodeIds) {
      let overview: NodeOverviewResponseView;
      try {
        overview = await this.nodeOverviewComposerService.buildOverview(nodeId);
      } catch (error) {
        this.logger.warn(
          `node overview realtime skipped (nodeId=${nodeId}, reason=${error instanceof Error ? error.message : String(error)})`,
        );
        continue;
      }

      const fingerprint = buildOverviewFingerprint(overview);
      if (this.fingerprintsByNodeId.get(nodeId) === fingerprint) {
        continue;
      }

      this.fingerprintsByNodeId.set(nodeId, fingerprint);
      emittedEvents += 1;
      await this.monitoringRealtimePort.emitNodeOverviewUpdated(
        mapNodeOverviewToRealtimeEvent(overview),
      );
    }

    this.checkpointSummaryTs =
      await this.nodeOverviewReadRepository.getLatestNodeChangeSummaryTs();

    return {
      emittedEvents,
      changedNodeIds: changedNodeIds.length,
      nextCheckpointSummaryTs: this.checkpointSummaryTs,
      initialized: false,
    };
  }
}

export function buildOverviewFingerprint(
  overview: NodeOverviewResponseView,
): string {
  return JSON.stringify({
    node: overview.node,
    summaryMetrics: overview.summaryMetrics,
    workloadSummary: overview.workloadSummary,
    workloads: overview.workloads,
  });
}
