import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { SchedulerRegistry } from '@nestjs/schedule';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import type { PollRackMonitoringUseCase } from './poll-rack-monitoring.use-case';
import {
  RACK_MONITORING_POLL_INTERVAL_NAME,
  RackMonitoringPollingScheduler,
} from './rack-monitoring-polling.scheduler';

describe('RackMonitoringPollingScheduler', () => {
  let addInterval: jest.Mock;
  let deleteInterval: jest.Mock;
  let doesExist: jest.Mock;
  let pollRackMonitoringUseCase: Pick<PollRackMonitoringUseCase, 'execute'>;

  beforeEach(() => {
    jest.useFakeTimers();
    addInterval = jest.fn();
    deleteInterval = jest.fn();
    doesExist = jest.fn().mockReturnValue(false);
    pollRackMonitoringUseCase = {
      execute: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('registers an automatic interval when polling is enabled', () => {
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
      MONITORING_RACK_POLL_INTERVAL_MS: '15000',
    });

    scheduler.onModuleInit();

    expect(addInterval).toHaveBeenCalledWith(
      RACK_MONITORING_POLL_INTERVAL_NAME,
      expect.any(Object),
    );
  });

  it('does not register an interval when polling is disabled', () => {
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'false',
    });

    scheduler.onModuleInit();

    expect(addInterval).not.toHaveBeenCalled();
  });

  it('uses full poll on every scheduled tick', async () => {
    const execute = pollRackMonitoringUseCase.execute as jest.Mock;
    execute
      .mockResolvedValueOnce({
        transitions: [],
        processedRows: 2,
        skippedRows: 0,
        nextCheckpointSummaryTs: '2026-07-09 16:45:00',
      })
      .mockResolvedValueOnce({
        transitions: [],
        processedRows: 1,
        skippedRows: 0,
        nextCheckpointSummaryTs: '2026-07-09 16:46:00',
      });

    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
    });

    await scheduler.handleInterval();
    await scheduler.handleInterval();

    expect(execute).toHaveBeenNthCalledWith(1, {});
    expect(execute).toHaveBeenNthCalledWith(2, {});
  });

  it('skips a new tick while the previous scheduled poll is still running', async () => {
    let resolveExecute: (() => void) | null = null;
    const execute = pollRackMonitoringUseCase.execute as jest.Mock;
    execute.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExecute = () =>
            resolve({
              transitions: [],
              processedRows: 0,
              skippedRows: 0,
              nextCheckpointSummaryTs: null,
            });
        }),
    );

    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
    });

    const firstRun = scheduler.handleInterval();
    await scheduler.handleInterval();

    expect(execute).toHaveBeenCalledTimes(1);

    resolveExecute?.();
    await firstRun;
  });

  it('removes the registered interval on module destroy', () => {
    doesExist.mockReturnValue(true);
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
    });

    scheduler.onModuleDestroy();

    expect(deleteInterval).toHaveBeenCalledWith(
      RACK_MONITORING_POLL_INTERVAL_NAME,
    );
  });

  function createScheduler(envOverrides: NodeJS.ProcessEnv) {
    const config = new MonitoringServiceConfig({
      ...envOverrides,
    });

    const schedulerRegistry: Pick<
      SchedulerRegistry,
      'addInterval' | 'deleteInterval' | 'doesExist'
    > = {
      addInterval,
      deleteInterval,
      doesExist,
    };

    return new RackMonitoringPollingScheduler(
      pollRackMonitoringUseCase as PollRackMonitoringUseCase,
      config,
      schedulerRegistry as SchedulerRegistry,
    );
  }
});
