import { describe, expect, it } from '@jest/globals';

import {
  applyAlertDeliveryResultToState,
  mapMonitoringTransitionToAlertDeliveryCommand,
} from './alert-delivery-command.mapper';
import type { MonitoringTransition } from '../ports/monitoring-transition';

describe('alert-delivery-command mapper', () => {
  it('maps activate transitions into firing delivery commands', () => {
    const command = mapMonitoringTransitionToAlertDeliveryCommand({
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
        numericIndicators: { badNodes: 13, totalNodes: 24 },
        booleanIndicators: { isRackLevelFailure: true },
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
    });

    expect(command).toMatchObject({
      transitionKind: 'activate',
      scopeKey: 'rack:rack-a1',
      startsAt: '2026-07-08T09:00:00.000Z',
      endsAt: null,
    });
  });

  it('skips repeated and noop transitions', () => {
    const transition = {
      transitionKind: 'repeated_active',
      summarySource: 'rack_current_summary',
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      observedAt: '2026-07-08T09:05:00.000Z',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      candidateIntent: 'activate',
      fingerprint: 'rack:rack-a1|severity:3',
      culprit: {
        entityId: null,
        metricKey: null,
        metricTagsJson: null,
        metricValueNumeric: null,
        metricValueText: null,
      },
      evidence: {
        numericIndicators: {},
        booleanIndicators: {},
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
        notificationSyncStatus: 'open_synced',
        firstObservedAt: '2026-07-08T09:00:00.000Z',
        lastObservedAt: '2026-07-08T09:05:00.000Z',
        lastStateChangedAt: '2026-07-08T09:00:00.000Z',
        openedAt: '2026-07-08T09:00:00.000Z',
        resolvedAt: null,
        lastNotificationAttemptAt: null,
        lastNotificationSyncedAt: null,
      },
    } as MonitoringTransition;

    expect(mapMonitoringTransitionToAlertDeliveryCommand(transition)).toBeNull();
  });

  it('applies delivery sync metadata back into state', () => {
    const nextState = applyAlertDeliveryResultToState(
      {
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
      {
        deliveredAt: '2026-07-08T09:00:02.000Z',
        syncStatus: 'open_synced',
      },
      '2026-07-08T09:00:01.000Z',
    );

    expect(nextState).toMatchObject({
      notificationSyncStatus: 'open_synced',
      lastNotificationAttemptAt: '2026-07-08T09:00:01.000Z',
      lastNotificationSyncedAt: '2026-07-08T09:00:02.000Z',
    });
  });
});
