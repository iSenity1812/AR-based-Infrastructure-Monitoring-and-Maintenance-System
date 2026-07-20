import { describe, expect, it } from '@jest/globals';

import type { MonitoringTransition } from '../ports/monitoring-transition';
import { mapTransitionToRackOverviewRealtimeEvent } from './rack-overview-realtime-event.mapper';

describe('mapTransitionToRackOverviewRealtimeEvent', () => {
  it('maps a rack transition into an overview-friendly realtime payload', () => {
    const transition = createTransition();

    const result = mapTransitionToRackOverviewRealtimeEvent(transition, {
      id: 'rack-a1',
      rackCode: 'RACK-A1',
      displayName: 'Rack A1',
      lifecycleState: 'ACTIVE',
      capacityState: 'AVAILABLE',
      siteCode: 'DC01',
      roomCode: 'ROOM-A',
      rowCode: 'ROW-03',
      positionCode: 'POS-12',
    });

    expect(result).toEqual(
      expect.objectContaining({
        event: 'monitoring.rack.overview.updated',
        scope: 'rack',
        view: 'operator_dashboard',
        rack: {
          id: 'rack-a1',
          name: 'Rack A1',
          code: 'RACK-A1',
        },
        status: expect.objectContaining({
          severity: 'critical',
          override: true,
          rackLevelFailure: true,
          signalLoss: true,
          staleNodes: 1,
        }),
        metrics: expect.objectContaining({
          totalNodes: 24,
          badNodes: 13,
          criticalNodes: 4,
          warningNodes: 8,
          badNodeRatio: 0.5417,
        }),
        culprit: expect.objectContaining({
          nodeId: 'node-17',
          metric: expect.objectContaining({
            key: 'node.memory_used_pct',
          }),
        }),
        trend: expect.objectContaining({
          delta1m: 0,
          delta5m: 0,
        }),
        location: expect.objectContaining({
          site: 'DC01',
          room: 'ROOM-A',
          row: 'ROW-03',
          position: 'POS-12',
        }),
      }),
    );
  });
});

function createTransition(): MonitoringTransition {
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
      metricKey: 'node.memory_used_pct',
      metricTagsJson: '{"host":"node-17"}',
      metricValueNumeric: 98.4,
      metricValueText: '98.4',
    },
    evidence: {
      numericIndicators: {
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 4,
        warningNodes: 8,
        staleNodes: 1,
        badNodeRatio: 0.5417,
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
