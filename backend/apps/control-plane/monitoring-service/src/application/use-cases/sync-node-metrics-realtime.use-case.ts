import { Inject, Injectable, Logger } from '@nestjs/common';

import { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import { NodeMetricsReadRepository } from '../ports/node-metrics-read.repository';
import {
  buildTrackedWorkloadFingerprint,
  NodeMetricsComposerService,
  type NodeMetricsUpdatedEventView,
  type NodeMetricsWorkloadsChangedEventView,
} from '../services/node-metrics-composer.service';

export interface SyncNodeMetricsRealtimeResult {
  emittedMetricEvents: number;
  emittedWorkloadMembershipEvents: number;
  changedNodeIds: number;
  nextCheckpointSummaryTs: string | null;
  initialized: boolean;
}

@Injectable()
export class SyncNodeMetricsRealtimeUseCase {
  private readonly logger = new Logger(SyncNodeMetricsRealtimeUseCase.name);
  private checkpointSummaryTs: string | null = null;
  private readonly metricFingerprintsByChannelKey = new Map<string, string>();
  private readonly workloadFingerprintsByNodeId = new Map<string, string>();

  constructor(
    @Inject(NodeMetricsReadRepository)
    private readonly nodeMetricsReadRepository: NodeMetricsReadRepository,
    private readonly nodeMetricsComposerService: NodeMetricsComposerService,
    @Inject(MonitoringRealtimePort)
    private readonly monitoringRealtimePort: MonitoringRealtimePort,
  ) {}

  async execute(): Promise<SyncNodeMetricsRealtimeResult> {
    if (!this.checkpointSummaryTs) {
      this.checkpointSummaryTs =
        await this.nodeMetricsReadRepository.getLatestMetricsChangeSummaryTs();

      return {
        emittedMetricEvents: 0,
        emittedWorkloadMembershipEvents: 0,
        changedNodeIds: 0,
        nextCheckpointSummaryTs: this.checkpointSummaryTs,
        initialized: true,
      };
    }

    const changedNodeIds =
      await this.nodeMetricsReadRepository.listChangedNodeIdsSince(
        this.checkpointSummaryTs,
      );
    const candidateNodeIds =
      await this.nodeMetricsReadRepository.listNodeIdsForMetricsSync();

    let emittedMetricEvents = 0;
    let emittedWorkloadMembershipEvents = 0;

    for (const nodeId of candidateNodeIds) {
      try {
        const workloadsChangedEvent =
          await this.nodeMetricsComposerService.buildWorkloadsChangedEvent(
            nodeId,
          );
        if (workloadsChangedEvent) {
          const workloadFingerprint = buildMetricsWorkloadMembershipFingerprint(
            workloadsChangedEvent,
          );
          if (
            this.workloadFingerprintsByNodeId.get(nodeId) !==
            workloadFingerprint
          ) {
            this.workloadFingerprintsByNodeId.set(nodeId, workloadFingerprint);
            emittedWorkloadMembershipEvents += 1;
            await this.monitoringRealtimePort.emitNodeMetricsWorkloadsChanged(
              workloadsChangedEvent,
            );
          }
        }

        emittedMetricEvents += await this.emitMetricsUpdatedEvent(
          nodeId,
          'minute',
        );
        emittedMetricEvents += await this.emitMetricsUpdatedEvent(nodeId, 'live');
      } catch (error) {
        this.logger.warn(
          `node metrics realtime skipped (nodeId=${nodeId}, reason=${error instanceof Error ? error.message : String(error)})`,
        );
      }
    }

    this.checkpointSummaryTs =
      await this.nodeMetricsReadRepository.getLatestMetricsChangeSummaryTs();

    return {
      emittedMetricEvents,
      emittedWorkloadMembershipEvents,
      changedNodeIds: changedNodeIds.length,
      nextCheckpointSummaryTs: this.checkpointSummaryTs,
      initialized: false,
    };
  }

  private async emitMetricsUpdatedEvent(
    nodeId: string,
    channelKind: 'minute' | 'live',
  ): Promise<number> {
    const metricsUpdatedEvent =
      await this.nodeMetricsComposerService.buildUpdatedEvent(
        nodeId,
        channelKind,
      );
    if (!metricsUpdatedEvent) {
      return 0;
    }

    const metricFingerprint = buildMetricsUpdatedFingerprint(metricsUpdatedEvent);
    const channelKey = `${nodeId}:${channelKind}`;
    if (
      this.metricFingerprintsByChannelKey.get(channelKey) === metricFingerprint
    ) {
      return 0;
    }

    this.metricFingerprintsByChannelKey.set(channelKey, metricFingerprint);
    await this.monitoringRealtimePort.emitNodeMetricsUpdated(metricsUpdatedEvent);
    return 1;
  }
}

export function buildMetricsUpdatedFingerprint(
  event: NodeMetricsUpdatedEventView,
): string {
  return JSON.stringify({
    ts: event.ts,
    node: event.node,
    workloads: event.workloads,
  });
}

export function buildMetricsWorkloadMembershipFingerprint(
  event: NodeMetricsWorkloadsChangedEventView,
): string {
  return buildTrackedWorkloadFingerprint(event.workloads);
}
