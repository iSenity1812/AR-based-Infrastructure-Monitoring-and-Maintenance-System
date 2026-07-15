import { describe, expect, it, jest } from '@jest/globals';

import type { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import type { RackContextProvider } from '../ports/rack-context.provider';
import { GetRackMonitoringStateUseCase } from './get-rack-monitoring-state.use-case';

describe('GetRackMonitoringStateUseCase', () => {
  it('returns rack monitoring state composed from active rack alerts with compatibility fields preserved', async () => {
    const alertCurrentStateRepository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn(),
      upsert: jest.fn(),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn().mockResolvedValue([
        {
          fingerprint: 'rack:rack-a1|critical',
          alertName: 'RackSignalLossPresent',
          scopeType: 'rack',
          rackId: 'rack-a1',
          rawLabels: {},
          rawAnnotations: {},
          severity: 'critical',
          status: 'firing',
          category: 'connectivity',
          environment: 'lab',
          team: 'infra',
          source: 'grafana',
          summary: 'Rack A1 signal loss with 1 silent node(s)',
          description: 'Rack A1 is reporting signal loss.',
          metricKey: 'silent_dead_nodes',
          observedWindow: '5m',
          dashboardUrl: '/d/monitoring-overview',
          runbookUrl: '/docs/runbooks/alerting/rack-signal-loss-present',
          currentValue: '1',
          threshold: '0',
          startsAt: '2026-07-08T09:55:00.000Z',
          endsAt: null,
          lastReceivedAt: '2026-07-08T09:59:30.000Z',
          firstSyncedAt: '2026-07-08T09:55:02.000Z',
          lastSyncedAt: '2026-07-08T09:55:03.000Z',
          lastStatusChangedAt: '2026-07-08T09:55:00.000Z',
        },
        {
          fingerprint: 'rack:rack-a1|warning',
          alertName: 'RackCoolingRiskWarning',
          scopeType: 'rack',
          rackId: 'rack-a1',
          rawLabels: {},
          rawAnnotations: {},
          severity: 'warning',
          status: 'firing',
          category: 'thermal',
          environment: 'lab',
          team: 'infra',
          source: 'grafana',
          summary: 'Rack A1 cooling margin is low',
          description: 'Cooling margin dropped below warning threshold.',
          metricKey: 'cooling_margin_pct',
          observedWindow: '5m',
          dashboardUrl: '/d/monitoring-overview',
          runbookUrl: '/docs/runbooks/alerting/rack-cooling-risk-warning',
          currentValue: '12',
          threshold: '15',
          startsAt: '2026-07-08T09:57:00.000Z',
          endsAt: null,
          lastReceivedAt: '2026-07-08T09:59:35.000Z',
          firstSyncedAt: '2026-07-08T09:57:02.000Z',
          lastSyncedAt: '2026-07-08T09:59:36.000Z',
          lastStatusChangedAt: '2026-07-08T09:57:00.000Z',
        },
      ]),
      listActiveNodeAlerts: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
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
      alertCurrentStateRepository,
      rackContextProvider,
    );

    const result = await useCase.execute();

    expect(alertCurrentStateRepository.listActiveRackAlerts).toHaveBeenCalled();
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
            fingerprint: 'rack:rack-a1|critical',
          },
          notification: {
            syncStatus: 'open_synced',
            lastNotificationAttemptAt: null,
            lastNotificationSyncedAt: '2026-07-08T09:55:03.000Z',
          },
          state: {
            status: 'alerting',
            highestSeverity: 'critical',
            activeAlertCount: 2,
            lastChangedAt: '2026-07-08T09:57:00.000Z',
          },
          alertSummary: {
            critical: 1,
            warning: 1,
          },
          primaryAlert: {
            fingerprint: 'rack:rack-a1|critical',
            alertName: 'RackSignalLossPresent',
            severity: 'critical',
            category: 'connectivity',
          },
          activeAlerts: [
            {
              fingerprint: 'rack:rack-a1|critical',
              alertName: 'RackSignalLossPresent',
            },
            {
              fingerprint: 'rack:rack-a1|warning',
              alertName: 'RackCoolingRiskWarning',
            },
          ],
        },
      ],
    });
  });
});
