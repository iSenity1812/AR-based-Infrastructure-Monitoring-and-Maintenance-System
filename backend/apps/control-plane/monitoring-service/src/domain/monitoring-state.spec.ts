import { describe, expect, it } from '@jest/globals';

import {
  buildMonitoringScopeKey,
  createMonitoringState,
  deriveInitialNotificationSyncStatus,
  deriveLifecycleStatus,
} from './monitoring-state';

describe('monitoring-state domain', () => {
  it('builds a stable scope key for polling deduplication', () => {
    expect(buildMonitoringScopeKey('rack', 'rack-a1')).toBe('rack:rack-a1');
    expect(buildMonitoringScopeKey('service', 'svc-auth')).toBe(
      'service:svc-auth',
    );
  });

  it('marks non-zero severity as active and pending open notification', () => {
    const state = createMonitoringState({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      fingerprint: 'rack-a1|3|cpu',
      severityCode: 3,
      overrideFlag: true,
      observedAt: '2026-07-07 09:30:00',
    });

    expect(state).toMatchObject({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack-a1|3|cpu',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
      firstObservedAt: '2026-07-07 09:30:00',
      lastObservedAt: '2026-07-07 09:30:00',
      lastStateChangedAt: '2026-07-07 09:30:00',
      openedAt: '2026-07-07 09:30:00',
      resolvedAt: null,
    });
  });

  it('keeps resolved states out of the notification pipeline by default', () => {
    const state = createMonitoringState({
      scopeType: 'service',
      scopeId: 'svc-auth',
      fingerprint: 'svc-auth|0',
      severityCode: 0,
      observedAt: '2026-07-07 09:31:00',
    });

    expect(state.lifecycleStatus).toBe('resolved');
    expect(state.notificationSyncStatus).toBe('idle');
    expect(state.openedAt).toBeNull();
    expect(state.resolvedAt).toBe('2026-07-07 09:31:00');
  });

  it('exposes small helpers with explicit lifecycle semantics', () => {
    expect(deriveLifecycleStatus(0)).toBe('resolved');
    expect(deriveLifecycleStatus(2)).toBe('active');
    expect(deriveInitialNotificationSyncStatus('active')).toBe('pending_open');
    expect(deriveInitialNotificationSyncStatus('resolved')).toBe('idle');
  });
});
