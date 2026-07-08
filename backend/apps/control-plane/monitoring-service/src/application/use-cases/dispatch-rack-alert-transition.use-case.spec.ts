import { describe, expect, it, jest } from '@jest/globals';

import type { AlertDeliveryPort } from '../ports/alert-delivery.port';
import type { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import type { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type { RackContextProvider } from '../ports/rack-context.provider';
import { DispatchRackAlertTransitionUseCase } from './dispatch-rack-alert-transition.use-case';
import type { MonitoringTransition } from '../ports/monitoring-transition';

describe('DispatchRackAlertTransitionUseCase', () => {
  it('sends activate transitions and persists synced notification state', async () => {
    const alertDeliveryPort: AlertDeliveryPort = {
      sendAlert: jest.fn().mockResolvedValue({
        deliveryStatus: 'delivered',
        deliveredAt: '2026-07-08T09:00:02.000Z',
        syncStatus: 'open_synced',
      }),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      listByScopeType: jest.fn(),
      findByScope: jest.fn(),
      save: jest.fn(),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn().mockResolvedValue(undefined),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn().mockResolvedValue(
        new Map([
          [
            'rack-a1',
            {
              id: 'rack-a1',
              rackCode: 'RACK-A1',
              displayName: 'Rack A1',
              lifecycleState: 'ACTIVE',
              capacityState: 'AVAILABLE',
            },
          ],
        ]),
      ),
    };
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
      monitoringRealtimePort,
      rackContextProvider,
    );

    const result = await useCase.execute(createActivateTransition());

    expect(alertDeliveryPort.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        transitionKind: 'activate',
        scopeKey: 'rack:rack-a1',
      }),
    );
    expect(monitoringStateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationSyncStatus: 'open_synced',
      }),
    );
    expect(monitoringRealtimePort.emitRackStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'rack',
        view: 'monitoring_state_delta',
        rackId: 'rack-a1',
        transitionKind: 'activate',
        notification: expect.objectContaining({
          syncStatus: 'open_synced',
        }),
      }),
    );
    expect(result.action).toBe('sent');
  });

  it('sends resolve transitions and emits one resolved realtime delta after persistence', async () => {
    const callOrder: string[] = [];
    const alertDeliveryPort: AlertDeliveryPort = {
      sendAlert: jest.fn().mockImplementation(async () => {
        callOrder.push('sendAlert');

        return {
          deliveryStatus: 'delivered',
          deliveredAt: '2026-07-08T10:15:02.000Z',
          syncStatus: 'resolve_synced',
        };
      }),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      listByScopeType: jest.fn(),
      findByScope: jest.fn(),
      save: jest.fn().mockImplementation(async () => {
        callOrder.push('save');
      }),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn().mockImplementation(async () => {
        callOrder.push('emit');
      }),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn().mockResolvedValue(
        new Map([
          [
            'rack-a1',
            {
              id: 'rack-a1',
              rackCode: 'RACK-A1',
              displayName: 'Rack A1',
              lifecycleState: 'ACTIVE',
              capacityState: 'AVAILABLE',
            },
          ],
        ]),
      ),
    };
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
      monitoringRealtimePort,
      rackContextProvider,
    );

    const result = await useCase.execute(createResolveTransition());

    expect(alertDeliveryPort.sendAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        transitionKind: 'resolve',
        scopeKey: 'rack:rack-a1',
      }),
    );
    expect(monitoringStateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycleStatus: 'resolved',
        notificationSyncStatus: 'resolve_synced',
      }),
    );
    expect(monitoringRealtimePort.emitRackStateChanged).toHaveBeenCalledTimes(1);
    expect(monitoringRealtimePort.emitRackStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'rack',
        view: 'monitoring_state_delta',
        rackId: 'rack-a1',
        transitionKind: 'resolve',
        notification: expect.objectContaining({
          syncStatus: 'resolve_synced',
        }),
        operational: expect.objectContaining({
          lifecycleStatus: 'resolved',
        }),
      }),
    );
    expect(callOrder).toEqual(['sendAlert', 'save', 'emit']);
    expect(result.action).toBe('sent');
  });

  it('skips noop transitions without persisting or emitting realtime deltas', async () => {
    const alertDeliveryPort: AlertDeliveryPort = {
      sendAlert: jest.fn(),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      listByScopeType: jest.fn(),
      findByScope: jest.fn(),
      save: jest.fn(),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn(),
    };
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
      monitoringRealtimePort,
      rackContextProvider,
    );

    const result = await useCase.execute(createNoopTransition());

    expect(result).toEqual({
      action: 'skipped',
      attemptedAt: null,
      deliveryResult: null,
    });
    expect(alertDeliveryPort.sendAlert).not.toHaveBeenCalled();
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
    expect(monitoringRealtimePort.emitRackStateChanged).not.toHaveBeenCalled();
    expect(rackContextProvider.batchGetRacks).not.toHaveBeenCalled();
  });

  it('skips repeated active transitions', async () => {
    const alertDeliveryPort: AlertDeliveryPort = {
      sendAlert: jest.fn(),
    };
    const monitoringStateRepository: MonitoringStateRepository = {
      listByScopeType: jest.fn(),
      findByScope: jest.fn(),
      save: jest.fn(),
    };
    const monitoringRealtimePort: MonitoringRealtimePort = {
      emitRackStateChanged: jest.fn(),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn(),
    };
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
      monitoringRealtimePort,
      rackContextProvider,
    );

    const result = await useCase.execute({
      ...createActivateTransition(),
      transitionKind: 'repeated_active',
    });

    expect(result).toEqual({
      action: 'skipped',
      attemptedAt: null,
      deliveryResult: null,
    });
    expect(alertDeliveryPort.sendAlert).not.toHaveBeenCalled();
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
    expect(monitoringRealtimePort.emitRackStateChanged).not.toHaveBeenCalled();
  });
});

function createActivateTransition(): MonitoringTransition {
  return {
    transitionKind: 'activate',
    summarySource: 'rack_current_summary',
    scopeType: 'rack',
    scopeId: 'rack-a1',
    scopeKey: 'rack:rack-a1',
    observedAt: '2026-07-08T09:00:00.000Z',
    severityCode: 3,
    overrideFlag: true,
    lifecycleStatus: 'active',
    candidateIntent: 'activate',
    fingerprint: 'rack:rack-a1|severity:3',
    culprit: {
      entityId: 'node-17',
      metricKey: 'cpu_usage_pct',
      metricTagsJson: '{"host":"node-17"}',
      metricValueNumeric: 98.4,
      metricValueText: '98.4',
    },
    evidence: {
      numericIndicators: {
        totalNodes: 24,
        badNodes: 13,
      },
      booleanIndicators: {
        isRackLevelFailure: true,
        hasSignalLoss: true,
      },
      textIndicators: {},
    },
    previousState: null,
    nextState: {
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
      firstObservedAt: '2026-07-08T09:00:00.000Z',
      lastObservedAt: '2026-07-08T09:00:00.000Z',
      lastStateChangedAt: '2026-07-08T09:00:00.000Z',
      openedAt: '2026-07-08T09:00:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: null,
      lastNotificationSyncedAt: null,
    },
  };
}

function createResolveTransition(): MonitoringTransition {
  return {
    transitionKind: 'resolve',
    summarySource: 'rack_current_summary',
    scopeType: 'rack',
    scopeId: 'rack-a1',
    scopeKey: 'rack:rack-a1',
    observedAt: '2026-07-08T10:15:00.000Z',
    severityCode: 0,
    overrideFlag: false,
    lifecycleStatus: 'resolved',
    candidateIntent: 'resolve',
    fingerprint: 'rack:rack-a1|severity:0',
    culprit: {
      entityId: null,
      metricKey: null,
      metricTagsJson: null,
      metricValueNumeric: null,
      metricValueText: null,
    },
    evidence: {
      numericIndicators: {
        totalNodes: 24,
        badNodes: 0,
      },
      booleanIndicators: {
        isRackLevelFailure: false,
        hasSignalLoss: false,
      },
      textIndicators: {},
    },
    previousState: {
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'open_synced',
      firstObservedAt: '2026-07-08T09:00:00.000Z',
      lastObservedAt: '2026-07-08T10:10:00.000Z',
      lastStateChangedAt: '2026-07-08T09:00:00.000Z',
      openedAt: '2026-07-08T09:00:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: '2026-07-08T09:00:01.000Z',
      lastNotificationSyncedAt: '2026-07-08T09:00:02.000Z',
    },
    nextState: {
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:0',
      severityCode: 0,
      overrideFlag: false,
      lifecycleStatus: 'resolved',
      notificationSyncStatus: 'pending_resolve',
      firstObservedAt: '2026-07-08T09:00:00.000Z',
      lastObservedAt: '2026-07-08T10:15:00.000Z',
      lastStateChangedAt: '2026-07-08T10:15:00.000Z',
      openedAt: '2026-07-08T09:00:00.000Z',
      resolvedAt: '2026-07-08T10:15:00.000Z',
      lastNotificationAttemptAt: null,
      lastNotificationSyncedAt: null,
    },
  };
}

function createNoopTransition(): MonitoringTransition {
  return {
    ...createActivateTransition(),
    transitionKind: 'noop',
    candidateIntent: 'noop',
    previousState: createActivateTransition().nextState,
    nextState: createActivateTransition().nextState,
  };
}
