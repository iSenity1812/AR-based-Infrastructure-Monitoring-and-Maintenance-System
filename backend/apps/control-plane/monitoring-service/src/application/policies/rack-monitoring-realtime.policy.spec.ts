import { describe, expect, it } from '@jest/globals';

import type { MonitoringTransition } from '../ports/monitoring-transition';
import { shouldEmitRackMonitoringStateChanged } from './rack-monitoring-realtime.policy';

describe('shouldEmitRackMonitoringStateChanged', () => {
  it('returns true for activate transitions on rack scope', () => {
    expect(
      shouldEmitRackMonitoringStateChanged(
        createTransition('activate', 'rack'),
      ),
    ).toBe(true);
  });

  it('returns true for resolve transitions on rack scope', () => {
    expect(
      shouldEmitRackMonitoringStateChanged(createTransition('resolve', 'rack')),
    ).toBe(true);
  });

  it('returns false for repeated_active transitions', () => {
    expect(
      shouldEmitRackMonitoringStateChanged(
        createTransition('repeated_active', 'rack'),
      ),
    ).toBe(false);
  });

  it('returns false for non-rack scopes', () => {
    expect(
      shouldEmitRackMonitoringStateChanged(createTransition('activate', 'node')),
    ).toBe(false);
  });
});

function createTransition(
  transitionKind: MonitoringTransition['transitionKind'],
  scopeType: MonitoringTransition['scopeType'],
): MonitoringTransition {
  return {
    transitionKind,
    summarySource: 'rack_current_summary',
    scopeType,
    scopeId: `${scopeType}-a1`,
    scopeKey: `${scopeType}:${scopeType}-a1`,
    observedAt: '2026-07-08T09:00:00.000Z',
    severityCode: 3,
    overrideFlag: true,
    lifecycleStatus: transitionKind === 'resolve' ? 'resolved' : 'active',
    candidateIntent: transitionKind === 'resolve' ? 'resolve' : 'activate',
    fingerprint: `${scopeType}:${scopeType}-a1|severity:3`,
    culprit: {
      entityId: 'node-17',
      metricKey: 'cpu_usage_pct',
      metricTagsJson: '{"host":"node-17"}',
      metricValueNumeric: 98.4,
      metricValueText: '98.4',
    },
    evidence: {
      numericIndicators: {},
      booleanIndicators: {},
      textIndicators: {},
    },
    previousState: null,
    nextState: {
      scopeType,
      scopeId: `${scopeType}-a1`,
      scopeKey: `${scopeType}:${scopeType}-a1`,
      fingerprint: `${scopeType}:${scopeType}-a1|severity:3`,
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: transitionKind === 'resolve' ? 'resolved' : 'active',
      notificationSyncStatus:
        transitionKind === 'resolve' ? 'resolve_synced' : 'open_synced',
      firstObservedAt: '2026-07-08T09:00:00.000Z',
      lastObservedAt: '2026-07-08T09:00:00.000Z',
      lastStateChangedAt: '2026-07-08T09:00:00.000Z',
      openedAt:
        transitionKind === 'resolve' ? '2026-07-08T08:50:00.000Z' : '2026-07-08T09:00:00.000Z',
      resolvedAt: transitionKind === 'resolve' ? '2026-07-08T09:00:00.000Z' : null,
      lastNotificationAttemptAt: '2026-07-08T09:00:01.000Z',
      lastNotificationSyncedAt: '2026-07-08T09:00:02.000Z',
    },
  };
}
