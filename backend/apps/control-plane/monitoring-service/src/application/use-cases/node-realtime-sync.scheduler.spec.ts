import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import {
  NODE_REALTIME_SYNC_INTERVAL_NAME,
  NodeRealtimeSyncScheduler,
} from './node-realtime-sync.scheduler';
import type { SyncNodeMetricsRealtimeUseCase } from './sync-node-metrics-realtime.use-case';
import type { SyncNodeOverviewRealtimeUseCase } from './sync-node-overview-realtime.use-case';

describe('NodeRealtimeSyncScheduler', () => {
  let clearIntervalSpy: jest.SpyInstance;
  let setIntervalSpy: jest.SpyInstance;
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

  it('registers an automatic interval when realtime sync is enabled', () => {
    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'true',
      MONITORING_NODE_REALTIME_SYNC_INTERVAL_MS: '5000',
    });

    scheduler.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('does not register an interval when realtime sync is disabled', () => {
    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'false',
    });

    scheduler.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('syncs overview and metrics on every scheduled tick', async () => {
    const syncOverviewExecute =
      syncNodeOverviewRealtimeUseCase.execute as jest.Mock;
    const syncMetricsExecute =
      syncNodeMetricsRealtimeUseCase.execute as jest.Mock;

    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'true',
    });

    await scheduler.handleInterval();
    await scheduler.handleInterval();

    expect(syncOverviewExecute).toHaveBeenCalledTimes(2);
    expect(syncMetricsExecute).toHaveBeenCalledTimes(2);
  });

  it('still syncs metrics when overview sync fails', async () => {
    const syncOverviewExecute =
      syncNodeOverviewRealtimeUseCase.execute as jest.Mock;
    const syncMetricsExecute =
      syncNodeMetricsRealtimeUseCase.execute as jest.Mock;
    syncOverviewExecute.mockRejectedValueOnce(new Error('overview failed'));

    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'true',
    });

    await scheduler.handleInterval();

    expect(syncOverviewExecute).toHaveBeenCalledTimes(1);
    expect(syncMetricsExecute).toHaveBeenCalledTimes(1);
  });

  it('skips a new tick while the previous sync is still running', async () => {
    let resolveExecute: (() => void) | null = null;
    const syncOverviewExecute =
      syncNodeOverviewRealtimeUseCase.execute as jest.Mock;
    syncOverviewExecute.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExecute = () =>
            resolve({
              emittedEvents: 0,
              changedNodeIds: 0,
              nextCheckpointSummaryTs: null,
              initialized: true,
            });
        }),
    );

    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'true',
    });

    const firstRun = scheduler.handleInterval();
    await scheduler.handleInterval();

    expect(syncOverviewExecute).toHaveBeenCalledTimes(1);

    resolveExecute?.();
    await firstRun;
  });

  it('clears the registered interval on module destroy', () => {
    const scheduler = createScheduler({
      MONITORING_NODE_REALTIME_SYNC_ENABLED: 'true',
    });

    scheduler.onModuleInit();
    scheduler.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object));
  });

  function createScheduler(envOverrides: NodeJS.ProcessEnv) {
    const config = new MonitoringServiceConfig({
      ...envOverrides,
    });

    return new NodeRealtimeSyncScheduler(
      syncNodeOverviewRealtimeUseCase as SyncNodeOverviewRealtimeUseCase,
      syncNodeMetricsRealtimeUseCase as SyncNodeMetricsRealtimeUseCase,
      config,
    );
  }
});
