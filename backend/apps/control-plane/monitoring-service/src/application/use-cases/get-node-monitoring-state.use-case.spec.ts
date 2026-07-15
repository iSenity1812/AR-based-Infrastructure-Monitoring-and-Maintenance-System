import { describe, expect, it, jest } from '@jest/globals';

import type { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import { GetNodeMonitoringStateUseCase } from './get-node-monitoring-state.use-case';

describe('GetNodeMonitoringStateUseCase', () => {
  it('returns node monitoring state grouped from active node alerts', async () => {
    const alertCurrentStateRepository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn(),
      upsert: jest.fn(),
      listByStatus: jest.fn(),
      listActiveRackAlerts: jest.fn(),
      listActiveNodeAlerts: jest.fn().mockResolvedValue([
        {
          fingerprint: 'fp-node-critical',
          alertName: 'NodeCpuTempCritical',
          scopeType: 'node',
          nodeId: 'node-msi-743e182b',
          rackId: 'rack-a1',
          rawLabels: {},
          rawAnnotations: {},
          severity: 'critical',
          status: 'firing',
          category: 'thermal',
          environment: 'lab',
          team: 'infra',
          source: 'grafana',
          summary: 'Node CPU temperature 94.4C > 90C',
          description: 'Node sustained CPU temperature above threshold.',
          metricKey: 'cpu_temperature_c_current',
          observedWindow: '5m',
          dashboardUrl: '/d/monitoring-overview',
          runbookUrl: '/docs/runbooks/alerting/node-cpu-temp-critical',
          currentValue: '94.4',
          threshold: '90',
          startsAt: '2026-07-15T15:14:30.000Z',
          endsAt: null,
          lastReceivedAt: '2026-07-15T15:15:00.000Z',
          firstSyncedAt: '2026-07-15T15:15:01.000Z',
          lastSyncedAt: '2026-07-15T15:15:01.000Z',
          lastStatusChangedAt: '2026-07-15T15:14:30.000Z',
        },
        {
          fingerprint: 'fp-node-warning',
          alertName: 'NodePacketLossHigh',
          scopeType: 'node',
          nodeId: 'node-msi-743e182b',
          rackId: 'rack-a1',
          rawLabels: {},
          rawAnnotations: {},
          severity: 'warning',
          status: 'firing',
          category: 'network',
          environment: 'lab',
          team: 'infra',
          source: 'grafana',
          summary: 'Node packet loss is high',
          description: 'Packet retransmit stayed above threshold.',
          metricKey: 'tcp_retransmit_pct_max_current',
          observedWindow: '5m',
          dashboardUrl: '/d/monitoring-overview',
          runbookUrl: '/docs/runbooks/alerting/node-packet-loss-high',
          currentValue: '8.4',
          threshold: '5',
          startsAt: '2026-07-15T15:16:00.000Z',
          endsAt: null,
          lastReceivedAt: '2026-07-15T15:16:30.000Z',
          firstSyncedAt: '2026-07-15T15:16:31.000Z',
          lastSyncedAt: '2026-07-15T15:16:31.000Z',
          lastStatusChangedAt: '2026-07-15T15:16:00.000Z',
        },
      ]),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
    };

    const useCase = new GetNodeMonitoringStateUseCase(
      alertCurrentStateRepository,
    );

    const result = await useCase.execute();

    expect(alertCurrentStateRepository.listActiveNodeAlerts).toHaveBeenCalled();
    expect(result).toMatchObject({
      scope: 'node',
      view: 'node_alert_state',
      items: [
        {
          nodeId: 'node-msi-743e182b',
          rackId: 'rack-a1',
          state: {
            status: 'alerting',
            highestSeverity: 'critical',
            activeAlertCount: 2,
            lastChangedAt: '2026-07-15T15:16:00.000Z',
          },
          alertSummary: {
            critical: 1,
            warning: 1,
          },
          primaryAlert: {
            fingerprint: 'fp-node-critical',
            alertName: 'NodeCpuTempCritical',
            severity: 'critical',
            category: 'thermal',
          },
          activeAlerts: [
            {
              fingerprint: 'fp-node-critical',
              alertName: 'NodeCpuTempCritical',
            },
            {
              fingerprint: 'fp-node-warning',
              alertName: 'NodePacketLossHigh',
            },
          ],
        },
      ],
    });
  });
});
