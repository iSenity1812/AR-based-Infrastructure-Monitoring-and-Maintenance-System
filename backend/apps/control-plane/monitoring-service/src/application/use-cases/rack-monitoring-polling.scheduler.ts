import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import {
  formatRackMonitoringPollCompletedMessage,
  formatRackMonitoringPollFailedMessage,
  formatRackMonitoringPollStartMessage,
} from './rack-monitoring-poll-observability';
import { PollRackMonitoringUseCase } from './poll-rack-monitoring.use-case';
import { SyncNodeMetricsRealtimeUseCase } from './sync-node-metrics-realtime.use-case';
import { SyncNodeOverviewRealtimeUseCase } from './sync-node-overview-realtime.use-case';

export const RACK_MONITORING_POLL_INTERVAL_NAME = 'rack-monitoring-poll';

@Injectable()
export class RackMonitoringPollingScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RackMonitoringPollingScheduler.name);

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(
    private readonly pollRackMonitoringUseCase: PollRackMonitoringUseCase,
    private readonly syncNodeOverviewRealtimeUseCase: SyncNodeOverviewRealtimeUseCase,
    private readonly syncNodeMetricsRealtimeUseCase: SyncNodeMetricsRealtimeUseCase,
    private readonly config: MonitoringServiceConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.monitoringRackPollEnabled) {
      this.logger.log('Automatic rack monitoring polling is disabled.');
      return;
    }

    if (
      !Number.isFinite(this.config.monitoringRackPollIntervalMs) ||
      this.config.monitoringRackPollIntervalMs <= 0
    ) {
      this.logger.warn(
        `Skipping automatic rack monitoring polling because MONITORING_RACK_POLL_INTERVAL_MS is invalid: ${this.config.monitoringRackPollIntervalMs}`,
      );
      return;
    }

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.intervalHandle = setInterval(() => {
      void this.handleInterval();
    }, this.config.monitoringRackPollIntervalMs);

    this.logger.log(
      `Automatic rack monitoring polling registered every ${this.config.monitoringRackPollIntervalMs}ms.`,
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
        'rack poll skipped (trigger=scheduled, reason=overlap, previousRun=still_running)',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();
    const input = {};

    this.logger.log(formatRackMonitoringPollStartMessage('scheduled', input));

    try {
      const result = await this.pollRackMonitoringUseCase.execute(input);
      const nodeOverviewRealtimeResult =
        await this.syncNodeOverviewRealtimeUseCase.execute();

      this.logger.log(
        formatRackMonitoringPollCompletedMessage(
          'scheduled',
          Date.now() - startedAt,
          result,
        ),
      );
      this.logger.log(
        `node overview realtime sync completed (trigger=scheduled, emittedEvents=${nodeOverviewRealtimeResult.emittedEvents}, changedNodeIds=${nodeOverviewRealtimeResult.changedNodeIds}, initialized=${nodeOverviewRealtimeResult.initialized}, nextCheckpoint=${nodeOverviewRealtimeResult.nextCheckpointSummaryTs ?? 'none'})`,
      );
      await this.syncNodeMetricsRealtime();
    } catch (error) {
      this.logger.error(
        formatRackMonitoringPollFailedMessage('scheduled', input, error),
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async syncNodeMetricsRealtime(): Promise<void> {
    try {
      const result = await this.syncNodeMetricsRealtimeUseCase.execute();
      this.logger.log(
        `node metrics realtime sync completed (trigger=scheduled, emittedMetricEvents=${result.emittedMetricEvents}, emittedWorkloadMembershipEvents=${result.emittedWorkloadMembershipEvents}, changedNodeIds=${result.changedNodeIds}, initialized=${result.initialized}, nextCheckpoint=${result.nextCheckpointSummaryTs ?? 'none'})`,
      );
    } catch (error) {
      this.logger.warn(
        `node metrics realtime sync failed (trigger=scheduled, reason=${error instanceof Error ? error.message : String(error)})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
