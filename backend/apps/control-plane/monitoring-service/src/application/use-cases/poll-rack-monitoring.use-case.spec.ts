import { describe, expect, it, jest } from '@jest/globals';

import type { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type {
  RackOverviewCurrentRackRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';
import type { DispatchRackAlertTransitionUseCase } from './dispatch-rack-alert-transition.use-case';
import {
  buildMonitoringTransition,
  PollRackMonitoringUseCase,
} from './poll-rack-monitoring.use-case';

describe('PollRackMonitoringUseCase', () => {
  it('uses incremental rack reads and emits activate transitions for new active racks', async () => {
    const rackRows: RackOverviewCurrentRackRecord[] = [
      {
        rackId: 'rack-a1',
        summaryTs: '2026-07-07 10:15:00',
        rackSeverityCode: 3,
        hasOverrideFlag: 1,
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 5,
        warningNodes: 8,
        staleNodes: 2,
        silentDeadNodes: 1,
        badNodeRatio: 0.5417,
        isRackLevelFailure: 1,
        hasSignalLoss: 1,
        worstNodeId: 'node-17',
        worstMetricKey: 'cpu_usage_pct',
        worstMetricTagsJson: '{"host":"node-17"}',
        worstMetricValueNumeric: 98.4,
        worstMetricValueText: '98.4',
      },
    ];
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest.fn().mockResolvedValue([]),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue(rackRows),
      getCurrentRackSummary: jest.fn(),
      listRecentRackHistory: jest.fn(),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      findByScope: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const dispatchRackAlertTransitionUseCase =
      createDispatchRackAlertTransitionUseCase();

    const useCase = new PollRackMonitoringUseCase(
      rackOverviewReadRepository,
      monitoringStateRepository,
      dispatchRackAlertTransitionUseCase,
    );

    const result = await useCase.execute({
      changedSinceSummaryTs: '2026-07-07 10:14:00',
    });

    expect(
      rackOverviewReadRepository.listCurrentRacksChangedSince,
    ).toHaveBeenCalledWith('2026-07-07 10:14:00');
    expect(result.processedRows).toBe(1);
    expect(result.skippedRows).toBe(0);
    expect(result.nextCheckpointSummaryTs).toBe('2026-07-07 10:15:00');
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]).toMatchObject({
      transitionKind: 'activate',
      scopeType: 'rack',
      scopeId: 'rack-a1',
      severityCode: 3,
      lifecycleStatus: 'active',
    });
    expect(dispatchRackAlertTransitionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: 'rack',
        scopeId: 'rack-a1',
        lifecycleStatus: 'active',
      }),
    );
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
  });

  it('deduplicates repeated identical active rack states', async () => {
    const rackRows: RackOverviewCurrentRackRecord[] = [
      {
        rackId: 'rack-a1',
        summaryTs: '2026-07-07 10:16:00',
        rackSeverityCode: 3,
        hasOverrideFlag: 1,
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 5,
        warningNodes: 8,
        staleNodes: 2,
        silentDeadNodes: 1,
        badNodeRatio: 0.5417,
        isRackLevelFailure: 1,
        hasSignalLoss: 1,
        worstNodeId: 'node-17',
        worstMetricKey: 'cpu_usage_pct',
        worstMetricTagsJson: '{"host":"node-17"}',
        worstMetricValueNumeric: 98.4,
        worstMetricValueText: '98.4',
      },
    ];
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest.fn().mockResolvedValue(rackRows),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
      getCurrentRackSummary: jest.fn(),
      listRecentRackHistory: jest.fn(),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      findByScope: jest.fn().mockResolvedValue({
        scopeType: 'rack',
        scopeId: 'rack-a1',
        scopeKey: 'rack:rack-a1',
        fingerprint:
          'rack:rack-a1|source:rack_current_summary|severity:3|override:1|culprit:node-17|metric:cpu_usage_pct',
        severityCode: 3,
        overrideFlag: true,
        lifecycleStatus: 'active',
        notificationSyncStatus: 'open_synced',
        firstObservedAt: '2026-07-07 10:10:00',
        lastObservedAt: '2026-07-07 10:15:00',
        lastStateChangedAt: '2026-07-07 10:10:00',
        openedAt: '2026-07-07 10:10:00',
        resolvedAt: null,
        lastNotificationAttemptAt: null,
        lastNotificationSyncedAt: '2026-07-07 10:10:05',
      }),
      save: jest.fn(),
    };
    const dispatchRackAlertTransitionUseCase =
      createDispatchRackAlertTransitionUseCase();

    const useCase = new PollRackMonitoringUseCase(
      rackOverviewReadRepository,
      monitoringStateRepository,
      dispatchRackAlertTransitionUseCase,
    );

    const result = await useCase.execute();

    expect(result.transitions[0]).toMatchObject({
      transitionKind: 'repeated_active',
      lifecycleStatus: 'active',
      previousState: expect.objectContaining({
        firstObservedAt: '2026-07-07 10:10:00',
      }),
      nextState: expect.objectContaining({
        firstObservedAt: '2026-07-07 10:10:00',
        lastObservedAt: '2026-07-07 10:16:00',
        notificationSyncStatus: 'open_synced',
      }),
    });
    expect(monitoringStateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeId: 'rack-a1',
        lifecycleStatus: 'active',
        lastObservedAt: '2026-07-07 10:16:00',
      }),
    );
    expect(dispatchRackAlertTransitionUseCase.execute).not.toHaveBeenCalled();
  });

  it('resolves previously active rack states when summary severity returns to zero', async () => {
    const transition = buildMonitoringTransition(
      {
        summarySource: 'rack_current_summary',
        scopeType: 'rack',
        scopeId: 'rack-a1',
        scopeKey: 'rack:rack-a1',
        observedAt: '2026-07-07 10:20:00',
        severityCode: 0,
        overrideFlag: false,
        lifecycleStatus: 'resolved',
        candidateIntent: 'resolve',
        fingerprint:
          'rack:rack-a1|source:rack_current_summary|severity:0|override:0|culprit:-|metric:-',
        culprit: {
          entityId: null,
          metricKey: null,
          metricTagsJson: null,
          metricValueNumeric: 0,
          metricValueText: null,
        },
        evidence: {
          numericIndicators: {},
          booleanIndicators: {},
          textIndicators: {},
        },
        candidateState: {
          scopeType: 'rack',
          scopeId: 'rack-a1',
          scopeKey: 'rack:rack-a1',
          fingerprint:
            'rack:rack-a1|source:rack_current_summary|severity:0|override:0|culprit:-|metric:-',
          severityCode: 0,
          overrideFlag: false,
          lifecycleStatus: 'resolved',
          notificationSyncStatus: 'idle',
          firstObservedAt: '2026-07-07 10:20:00',
          lastObservedAt: '2026-07-07 10:20:00',
          lastStateChangedAt: '2026-07-07 10:20:00',
          openedAt: null,
          resolvedAt: '2026-07-07 10:20:00',
          lastNotificationAttemptAt: null,
          lastNotificationSyncedAt: null,
        },
      },
      {
        scopeType: 'rack',
        scopeId: 'rack-a1',
        scopeKey: 'rack:rack-a1',
        fingerprint:
          'rack:rack-a1|source:rack_current_summary|severity:3|override:1|culprit:node-17|metric:cpu_usage_pct',
        severityCode: 3,
        overrideFlag: true,
        lifecycleStatus: 'active',
        notificationSyncStatus: 'open_synced',
        firstObservedAt: '2026-07-07 10:10:00',
        lastObservedAt: '2026-07-07 10:19:00',
        lastStateChangedAt: '2026-07-07 10:10:00',
        openedAt: '2026-07-07 10:10:00',
        resolvedAt: null,
        lastNotificationAttemptAt: '2026-07-07 10:10:05',
        lastNotificationSyncedAt: '2026-07-07 10:10:06',
      },
    );

    expect(transition).toMatchObject({
      transitionKind: 'resolve',
      lifecycleStatus: 'resolved',
      nextState: expect.objectContaining({
        lifecycleStatus: 'resolved',
        notificationSyncStatus: 'pending_resolve',
        firstObservedAt: '2026-07-07 10:10:00',
        openedAt: '2026-07-07 10:10:00',
        resolvedAt: '2026-07-07 10:20:00',
      }),
    });
  });

  it('dispatches resolved transitions instead of persisting them locally first', async () => {
    const rackRows: RackOverviewCurrentRackRecord[] = [
      {
        rackId: 'rack-a1',
        summaryTs: '2026-07-07 10:20:00',
        rackSeverityCode: 0,
        hasOverrideFlag: 0,
        totalNodes: 24,
        badNodes: 0,
        criticalNodes: 0,
        warningNodes: 0,
        staleNodes: 0,
        silentDeadNodes: 0,
        badNodeRatio: 0,
        isRackLevelFailure: 0,
        hasSignalLoss: 0,
        worstNodeId: '',
        worstMetricKey: '',
        worstMetricTagsJson: '',
        worstMetricValueNumeric: 0,
        worstMetricValueText: '',
      },
    ];
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest.fn().mockResolvedValue(rackRows),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
      getCurrentRackSummary: jest.fn(),
      listRecentRackHistory: jest.fn(),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      findByScope: jest.fn().mockResolvedValue({
        scopeType: 'rack',
        scopeId: 'rack-a1',
        scopeKey: 'rack:rack-a1',
        fingerprint:
          'rack:rack-a1|source:rack_current_summary|severity:3|override:1|culprit:node-17|metric:cpu_usage_pct',
        severityCode: 3,
        overrideFlag: true,
        lifecycleStatus: 'active',
        notificationSyncStatus: 'open_synced',
        firstObservedAt: '2026-07-07 10:10:00',
        lastObservedAt: '2026-07-07 10:19:00',
        lastStateChangedAt: '2026-07-07 10:10:00',
        openedAt: '2026-07-07 10:10:00',
        resolvedAt: null,
        lastNotificationAttemptAt: '2026-07-07 10:10:05',
        lastNotificationSyncedAt: '2026-07-07 10:10:06',
      }),
      save: jest.fn(),
    };
    const dispatchRackAlertTransitionUseCase =
      createDispatchRackAlertTransitionUseCase();

    const useCase = new PollRackMonitoringUseCase(
      rackOverviewReadRepository,
      monitoringStateRepository,
      dispatchRackAlertTransitionUseCase,
    );

    const result = await useCase.execute();

    expect(result.transitions[0]).toMatchObject({
      transitionKind: 'resolve',
      lifecycleStatus: 'resolved',
    });
    expect(dispatchRackAlertTransitionUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        transitionKind: 'resolve',
        scopeId: 'rack-a1',
      }),
    );
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
  });
});

function createDispatchRackAlertTransitionUseCase(): Pick<
  DispatchRackAlertTransitionUseCase,
  'execute'
> {
  return {
    execute: jest.fn().mockResolvedValue({
      action: 'sent',
      attemptedAt: '2026-07-08T09:00:01.000Z',
      deliveryResult: {
        deliveryStatus: 'delivered',
        deliveredAt: '2026-07-08T09:00:02.000Z',
        syncStatus: 'open_synced',
      },
    }),
  };
}
