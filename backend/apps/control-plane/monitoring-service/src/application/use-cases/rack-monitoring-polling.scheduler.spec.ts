import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import type { PollRackMonitoringUseCase } from './poll-rack-monitoring.use-case';
import {
  RACK_MONITORING_POLL_INTERVAL_NAME,
  RackMonitoringPollingScheduler,
} from './rack-monitoring-polling.scheduler';
import type { SyncNodeMetricsRealtimeUseCase } from './sync-node-metrics-realtime.use-case';
import type { SyncNodeOverviewRealtimeUseCase } from './sync-node-overview-realtime.use-case';

describe('RackMonitoringPollingScheduler', () => {
  let clearIntervalSpy: jest.SpyInstance;
  let setIntervalSpy: jest.SpyInstance;
  let pollRackMonitoringUseCase: Pick<PollRackMonitoringUseCase, 'execute'>;
  let syncNodeOverviewRealtimeUseCase: Pick<
    SyncNodeOverviewRealtimeUseCase,
    'execute'
  >;
  let syncNodeMetricsRealtimeUseCase: Pick<
    SyncNodeMetricsRealtimeUseCase,
    'execute'
  >;

  beforeEach(() => {
    jest.useFakeTimers();
    clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    setIntervalSpy = jest.spyOn(global, 'setInterval');
    pollRackMonitoringUseCase = {
      execute: jest.fn(),
    };
    syncNodeOverviewRealtimeUseCase = {
      execute: jest.fn().mockResolvedValue({
        emittedEvents: 0,
        changedNodeIds: 0,
        nextCheckpointSummaryTs: null,
        initialized: true,
      }),
    };
    syncNodeMetricsRealtimeUseCase = {
      execute: jest.fn().mockResolvedValue({
        emittedMetricEvents: 0,
        emittedWorkloadMembershipEvents: 0,
        changedNodeIds: 0,
        nextCheckpointSummaryTs: null,
        initialized: true,
      }),
    };
  });

  afterEach(() => {
    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('registers an automatic interval when polling is enabled', () => {
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
      MONITORING_RACK_POLL_INTERVAL_MS: '15000',
    });

    scheduler.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
  });

  it('does not register an interval when polling is disabled', () => {
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'false',
    });

    scheduler.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();
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

  it('clears the registered interval on module destroy', () => {
    const scheduler = createScheduler({
      MONITORING_RACK_POLL_ENABLED: 'true',
    });

    scheduler.onModuleInit();
    scheduler.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));
  });

  function createScheduler(envOverrides: NodeJS.ProcessEnv) {
    const config = new MonitoringServiceConfig({
      ...envOverrides,
    });

    return new RackMonitoringPollingScheduler(
      pollRackMonitoringUseCase as PollRackMonitoringUseCase,
      syncNodeOverviewRealtimeUseCase as SyncNodeOverviewRealtimeUseCase,
      syncNodeMetricsRealtimeUseCase as SyncNodeMetricsRealtimeUseCase,
      config,
    );
  }
});
