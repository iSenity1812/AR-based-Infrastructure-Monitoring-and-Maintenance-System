import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import { PollRackMonitoringUseCase } from './poll-rack-monitoring.use-case';

export const RACK_MONITORING_POLL_INTERVAL_NAME = 'rack-monitoring-poll';

@Injectable()
export class RackMonitoringPollingScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RackMonitoringPollingScheduler.name);

  private isRunning = false;

  private lastCheckpointSummaryTs: string | null = null;

  constructor(
    private readonly pollRackMonitoringUseCase: PollRackMonitoringUseCase,
    private readonly config: MonitoringServiceConfig,
    private readonly schedulerRegistry: SchedulerRegistry,
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

    if (
      this.schedulerRegistry.doesExist(
        'interval',
        RACK_MONITORING_POLL_INTERVAL_NAME,
      )
    ) {
      this.schedulerRegistry.deleteInterval(RACK_MONITORING_POLL_INTERVAL_NAME);
    }

    const interval = setInterval(() => {
      void this.handleInterval();
    }, this.config.monitoringRackPollIntervalMs);

    this.schedulerRegistry.addInterval(
      RACK_MONITORING_POLL_INTERVAL_NAME,
      interval,
    );

    this.logger.log(
      `Automatic rack monitoring polling registered every ${this.config.monitoringRackPollIntervalMs}ms.`,
    );
  }

  onModuleDestroy(): void {
    if (
      this.schedulerRegistry.doesExist(
        'interval',
        RACK_MONITORING_POLL_INTERVAL_NAME,
      )
    ) {
      this.schedulerRegistry.deleteInterval(RACK_MONITORING_POLL_INTERVAL_NAME);
    }
  }

  async handleInterval(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(
        'Skipping automatic rack monitoring poll because the previous run is still in progress.',
      );
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();

    try {
      const result = await this.pollRackMonitoringUseCase.execute(
        this.lastCheckpointSummaryTs
          ? {
              changedSinceSummaryTs: this.lastCheckpointSummaryTs,
            }
          : {},
      );

      if (result.nextCheckpointSummaryTs) {
        this.lastCheckpointSummaryTs = result.nextCheckpointSummaryTs;
      }

      this.logger.log(
        `Automatic rack monitoring poll completed in ${Date.now() - startedAt}ms (processed=${result.processedRows}, skipped=${result.skippedRows}, transitions=${result.transitions.length}, checkpoint=${this.lastCheckpointSummaryTs ?? 'none'}).`,
      );
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Automatic rack monitoring poll failed.', stack);
    } finally {
      this.isRunning = false;
    }
  }
}
