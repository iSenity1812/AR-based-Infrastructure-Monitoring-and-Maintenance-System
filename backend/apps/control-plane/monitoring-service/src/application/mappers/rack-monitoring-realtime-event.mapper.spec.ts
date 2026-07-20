import { describe, expect, it } from '@jest/globals';

import { mapTransitionToRackMonitoringStateChangedEvent } from './rack-monitoring-realtime-event.mapper';

describe('mapTransitionToRackMonitoringStateChangedEvent', () => {
  it('maps activate rack transitions into a UI-facing realtime delta payload', () => {
    const event = mapTransitionToRackMonitoringStateChangedEvent(
      createRackActivateTransition(),
      {
        id: 'rack-a1',
        rackCode: 'RACK-A1',
        displayName: 'Rack A1',
        lifecycleState: 'ACTIVE',
        capacityState: 'AVAILABLE',
      },
    );

    expect(event).toMatchObject({
      scope: 'rack',
      view: 'monitoring_state_delta',
      rackId: 'rack-a1',
      rackName: 'Rack A1',
      rackCode: 'RACK-A1',
      transitionKind: 'activate',
      operational: {
        severityCode: 3,
        lifecycleStatus: 'active',
      },
      notification: {
        syncStatus: 'open_synced',
      },
    });
  });

  it('returns null for repeated active transitions', () => {
    const event = mapTransitionToRackMonitoringStateChangedEvent({
      ...createRackActivateTransition(),
      transitionKind: 'repeated_active',
    });

    expect(event).toBeNull();
  });
});

function createRackActivateTransition() {
  return {
    transitionKind: 'activate' as const,
    summarySource: 'rack_current_summary' as const,
    scopeType: 'rack' as const,
    scopeId: 'rack-a1',
    scopeKey: 'rack:rack-a1',
    observedAt: '2026-07-08T09:00:00.000Z',
    severityCode: 3,
    overrideFlag: true,
    lifecycleStatus: 'active' as const,
    candidateIntent: 'activate' as const,
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
      scopeType: 'rack' as const,
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active' as const,
      notificationSyncStatus: 'open_synced' as const,
      firstObservedAt: '2026-07-08T09:00:00.000Z',
      lastObservedAt: '2026-07-08T09:00:00.000Z',
      lastStateChangedAt: '2026-07-08T09:00:00.000Z',
      openedAt: '2026-07-08T09:00:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: '2026-07-08T09:00:01.000Z',
      lastNotificationSyncedAt: '2026-07-08T09:00:02.000Z',
    },
  };
}
