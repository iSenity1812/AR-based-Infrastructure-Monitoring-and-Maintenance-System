import { describe, expect, it, jest } from '@jest/globals';

import type { RackContextProvider } from '../ports/rack-context.provider';
import type { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import { GetRackMonitoringStateUseCase } from './get-rack-monitoring-state.use-case';

describe('GetRackMonitoringStateUseCase', () => {
  it('returns rack monitoring state with separated operational and notification sections', async () => {
    const monitoringStateRepository: MonitoringStateRepository = {
      listByScopeType: jest.fn().mockResolvedValue([
        {
          scopeType: 'rack',
          scopeId: 'rack-a1',
          scopeKey: 'rack:rack-a1',
          fingerprint: 'rack:rack-a1|severity:3',
          severityCode: 3,
          overrideFlag: true,
          lifecycleStatus: 'active',
          notificationSyncStatus: 'open_synced',
          firstObservedAt: '2026-07-08T09:55:00.000Z',
          lastObservedAt: '2026-07-08T09:59:30.000Z',
          lastStateChangedAt: '2026-07-08T09:55:00.000Z',
          openedAt: '2026-07-08T09:55:00.000Z',
          resolvedAt: null,
          lastNotificationAttemptAt: '2026-07-08T09:55:02.000Z',
          lastNotificationSyncedAt: '2026-07-08T09:55:03.000Z',
        },
      ]),
      findByScope: jest.fn(),
      save: jest.fn(),
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

    const useCase = new GetRackMonitoringStateUseCase(
      monitoringStateRepository,
      rackContextProvider,
    );

    const result = await useCase.execute();

    expect(monitoringStateRepository.listByScopeType).toHaveBeenCalledWith(
      'rack',
    );
    expect(result).toMatchObject({
      scope: 'rack',
      view: 'monitoring_state',
      items: [
        {
          rackId: 'rack-a1',
          rackName: 'Rack A1',
          rackCode: 'RACK-A1',
          operational: {
            severityCode: 3,
            overrideFlag: true,
            lifecycleStatus: 'active',
          },
          notification: {
            syncStatus: 'open_synced',
            lastNotificationAttemptAt: '2026-07-08T09:55:02.000Z',
            lastNotificationSyncedAt: '2026-07-08T09:55:03.000Z',
          },
        },
      ],
    });
  });
});
