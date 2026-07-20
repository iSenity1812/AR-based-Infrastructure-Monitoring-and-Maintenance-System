import { describe, expect, it, jest } from '@jest/globals';

import {
  mapDocumentToMonitoringState,
  mapMonitoringStateToPersistence,
  MonitoringStateMongoRepository,
} from './monitoring-state-mongo.repository';

describe('MonitoringStateMongoRepository mappings', () => {
  it('maps monitoring state into persistence shape for upsert', () => {
    const persistence = mapMonitoringStateToPersistence({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
      firstObservedAt: '2026-07-08T08:10:00.000Z',
      lastObservedAt: '2026-07-08T08:12:00.000Z',
      lastStateChangedAt: '2026-07-08T08:10:00.000Z',
      openedAt: '2026-07-08T08:10:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: null,
      lastNotificationSyncedAt: null,
    });

    expect(persistence).toMatchObject({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
    });
  });

  it('maps persistence document back into monitoring state', () => {
    const state = mapDocumentToMonitoringState({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'open_synced',
      firstObservedAt: '2026-07-08T08:10:00.000Z',
      lastObservedAt: '2026-07-08T08:12:00.000Z',
      lastStateChangedAt: '2026-07-08T08:10:00.000Z',
      openedAt: '2026-07-08T08:10:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: null,
      lastNotificationSyncedAt: '2026-07-08T08:10:05.000Z',
    });

    expect(state).toMatchObject({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      notificationSyncStatus: 'open_synced',
    });
  });
});

describe('MonitoringStateMongoRepository', () => {
  it('looks up by scope key and upserts by scope key', async () => {
    const execFind = jest.fn().mockResolvedValue(null);
    const lean = jest.fn().mockReturnValue({ exec: execFind });
    const findOne = jest.fn().mockReturnValue({ lean });
    const execUpdate = jest.fn().mockResolvedValue(undefined);
    const updateOne = jest.fn().mockReturnValue({ exec: execUpdate });
    const repository = new MonitoringStateMongoRepository({
      findOne,
      updateOne,
    } as never);

    await repository.findByScope('rack', 'rack-a1');
    await repository.save({
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      fingerprint: 'rack:rack-a1|severity:3',
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
      firstObservedAt: '2026-07-08T08:10:00.000Z',
      lastObservedAt: '2026-07-08T08:10:00.000Z',
      lastStateChangedAt: '2026-07-08T08:10:00.000Z',
      openedAt: '2026-07-08T08:10:00.000Z',
      resolvedAt: null,
      lastNotificationAttemptAt: null,
      lastNotificationSyncedAt: null,
    });

    expect(findOne).toHaveBeenCalledWith({ scopeKey: 'rack:rack-a1' });
    expect(updateOne).toHaveBeenCalledWith(
      { scopeKey: 'rack:rack-a1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          scopeKey: 'rack:rack-a1',
          fingerprint: 'rack:rack-a1|severity:3',
        }),
      }),
      { upsert: true },
    );
  });
});
