import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import { SyncNodeLivenessTransitionsUseCase } from './sync-node-liveness-transitions.use-case';
import { SyncNodeMetricsRealtimeUseCase } from './sync-node-metrics-realtime.use-case';
import { SyncNodeOverviewRealtimeUseCase } from './sync-node-overview-realtime.use-case';

export const NODE_REALTIME_SYNC_INTERVAL_NAME = 'node-realtime-sync';

@Injectable()
export class NodeRealtimeSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodeRealtimeSyncScheduler.name);

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(
    private readonly syncNodeOverviewRealtimeUseCase: SyncNodeOverviewRealtimeUseCase,
    private readonly syncNodeMetricsRealtimeUseCase: SyncNodeMetricsRealtimeUseCase,
    private readonly syncNodeLivenessTransitionsUseCase: SyncNodeLivenessTransitionsUseCase,
    private readonly config: MonitoringServiceConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.monitoringNodeRealtimeSyncEnabled) {
      this.logger.debug('Automatic node realtime sync is disabled.');
      return;
    }

    if (
      !Number.isFinite(this.config.monitoringNodeRealtimeSyncIntervalMs) ||
      this.config.monitoringNodeRealtimeSyncIntervalMs <= 0
    ) {
      this.logger.warn(
        `Skipping automatic node realtime sync because MONITORING_NODE_REALTIME_SYNC_INTERVAL_MS is invalid: ${this.config.monitoringNodeRealtimeSyncIntervalMs}`,
      );
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.intervalHandle = setInterval(() => {
      void this.handleInterval();
    }, this.config.monitoringNodeRealtimeSyncIntervalMs);

    this.logger.debug(
      `Automatic node realtime sync registered every ${this.config.monitoringNodeRealtimeSyncIntervalMs}ms.`,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async handleInterval(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'node realtime sync skipped (trigger=scheduled, reason=overlap, previousRun=still_running)',
      );
      return;
    }

    this.isRunning = true;

    try {
      await this.syncNodeOverviewRealtime();
      await this.syncNodeMetricsRealtime();
      await this.syncNodeLivenessTransitions();
    } finally {
      this.isRunning = false;
    }
  }

  private async syncNodeOverviewRealtime(): Promise<void> {
    try {
      const result = await this.syncNodeOverviewRealtimeUseCase.execute();
      this.logger.verbose(
        `node overview realtime sync completed (trigger=scheduled, emittedEvents=${result.emittedEvents}, changedNodeIds=${result.changedNodeIds}, initialized=${result.initialized}, nextCheckpoint=${result.nextCheckpointSummaryTs ?? 'none'})`,
      );
    } catch (error) {
      this.logger.warn(
        `node overview realtime sync failed (trigger=scheduled, reason=${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async syncNodeMetricsRealtime(): Promise<void> {
    try {
      const result = await this.syncNodeMetricsRealtimeUseCase.execute();
      this.logger.verbose(
        `node metrics realtime sync completed (trigger=scheduled, emittedMetricEvents=${result.emittedMetricEvents}, emittedWorkloadMembershipEvents=${result.emittedWorkloadMembershipEvents}, changedNodeIds=${result.changedNodeIds}, initialized=${result.initialized}, nextCheckpoint=${result.nextCheckpointSummaryTs ?? 'none'})`,
      );
    } catch (error) {
      this.logger.warn(
        `node metrics realtime sync failed (trigger=scheduled, reason=${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async syncNodeLivenessTransitions(): Promise<void> {
    try {
      const result = await this.syncNodeLivenessTransitionsUseCase.execute();
      this.logger.verbose(
        `node liveness transition sync completed (trigger=scheduled, evaluatedNodeIds=${result.evaluatedNodeIds}, transitionedNodeIds=${result.transitionedNodeIds}, emittedEvents=${result.emittedEvents})`,
      );
    } catch (error) {
      this.logger.warn(
        `node liveness transition sync failed (trigger=scheduled, reason=${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
