import { describe, expect, it, jest } from '@jest/globals';

import {
  MONITORING_NODE_OVERVIEW_UPDATED_EVENT,
  MONITORING_RACK_STATE_CHANGED_EVENT,
  MonitoringRealtimeGateway,
} from './monitoring-realtime.gateway';

describe('MonitoringRealtimeGateway', () => {
  it('emits rack monitoring state changes on the expected event channel', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitRackStateChanged({
      scope: 'rack',
      view: 'monitoring_state_delta',
      rackId: 'rack-a1',
      rackName: 'Rack A1',
      rackCode: 'RACK-A1',
      transitionKind: 'activate',
      changedAt: '2026-07-08T10:00:00.000Z',
      operational: {
        severityCode: 3,
        overrideFlag: true,
        lifecycleStatus: 'active',
        fingerprint: 'rack:rack-a1|severity:3',
        firstObservedAt: '2026-07-08T09:55:00.000Z',
        lastObservedAt: '2026-07-08T10:00:00.000Z',
        lastStateChangedAt: '2026-07-08T10:00:00.000Z',
        openedAt: '2026-07-08T09:55:00.000Z',
        resolvedAt: null,
      },
      notification: {
        syncStatus: 'open_synced',
        lastNotificationAttemptAt: '2026-07-08T10:00:01.000Z',
        lastNotificationSyncedAt: '2026-07-08T10:00:02.000Z',
      },
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_RACK_STATE_CHANGED_EVENT,
      expect.objectContaining({
        rackId: 'rack-a1',
        transitionKind: 'activate',
      }),
    );
  });

  it('emits node overview updates on the expected event channel', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitNodeOverviewUpdated({
      nodeId: 'node-a1',
      emittedAt: '2026-07-10T10:00:00.000Z',
      node: {
        nodeId: 'node-a1',
        status: 'alerting',
        severity: 'high',
        lastSeenAt: '2026-07-10T09:59:59.000Z',
        freshnessSec: 1,
      },
      summaryMetrics: {
        cpuUsagePct: 90,
        memoryUsagePct: 80,
        diskUsagePct: 70,
        cpuTemperatureC: 92,
        networkRxBytesSec: 1000,
        networkTxBytesSec: 900,
        primaryNicStatus: 'up',
        worstMetric: {
          metricKey: 'node.cpu_temperature_c',
          metricValueNumeric: 92,
          metricValueText: '92',
        },
        alertCounters: {
          criticalMetricCount: 1,
          warningMetricCount: 1,
          staleMetricCount: 0,
        },
      },
      workloadSummary: {
        total: 2,
        unhealthy: 1,
        nonRunning: 0,
        highCpu: 1,
        highMemory: 0,
        returned: 2,
        selectionMode: 'abnormal_first_then_top_cpu',
      },
      workloads: [],
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_NODE_OVERVIEW_UPDATED_EVENT,
      expect.objectContaining({
        nodeId: 'node-a1',
      }),
    );
  });
});
