import { describe, expect, it, jest } from '@jest/globals';

import type { AlertDeliveryPort } from '../ports/alert-delivery.port';
import type { MonitoringStateRepository } from '../ports/monitoring-state.repository';
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
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
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
    expect(result.action).toBe('sent');
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
    const useCase = new DispatchRackAlertTransitionUseCase(
      alertDeliveryPort,
      monitoringStateRepository,
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
