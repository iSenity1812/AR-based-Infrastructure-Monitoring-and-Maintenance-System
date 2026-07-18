import { describe, expect, it, jest } from '@jest/globals';

import {
  MONITORING_NODE_METRICS_UPDATED_EVENT,
  MONITORING_NODE_METRICS_WORKLOADS_CHANGED_EVENT,
  MONITORING_NODE_OVERVIEW_CHANGED_EVENT,
  MONITORING_RACK_OVERVIEW_UPDATED_EVENT,
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

  it('emits rack overview updates on the expected event channel', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitRackOverviewUpdated({
      event: 'monitoring.rack.overview.updated',
      scope: 'rack',
      view: 'operator_dashboard',
      rack: {
        id: 'rack-a1',
        name: 'Rack A1',
        code: 'RACK-A1',
      },
      status: {
        severity: 'critical',
        override: true,
        rackLevelFailure: true,
        signalLoss: true,
        staleNodes: 1,
      },
      metrics: {
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 4,
        warningNodes: 8,
        badNodeRatio: 0.5417,
      },
      culprit: {
        nodeId: 'node-17',
        metric: {
          key: 'node.memory_used_pct',
          tags: {
            host: 'node-17',
          },
          value: {
            numeric: 98.4,
            text: '98.4',
          },
        },
      },
      trend: {
        delta1m: 0,
        delta5m: 0,
        lastChangeAgeSec: 0,
      },
      updatedAt: '2026-07-08T10:00:00.000Z',
      location: {
        site: 'DC01',
        room: 'ROOM-A',
        row: 'ROW-03',
        position: 'POS-12',
      },
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_RACK_OVERVIEW_UPDATED_EVENT,
      expect.objectContaining({
        rack: expect.objectContaining({
          id: 'rack-a1',
        }),
      }),
    );
  });

  it('emits node overview change signals on the expected event channels', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitNodeOverviewChanged({
      event: 'monitoring.node.overview.changed',
      nodeId: 'node-a1',
      channel: 'monitoring.node.node-a1.overview.changed',
      changedAt: '2026-07-10T10:00:00.000Z',
      fingerprint: 'fingerprint-a1',
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_NODE_OVERVIEW_CHANGED_EVENT,
      expect.objectContaining({
        nodeId: 'node-a1',
      }),
    );
    expect(emit).toHaveBeenCalledWith(
      'monitoring.node.node-a1.overview.changed',
      expect.objectContaining({
        fingerprint: 'fingerprint-a1',
      }),
    );
  });

  it('emits node metrics updates on the expected event channel', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitNodeMetricsUpdated({
      event: 'monitoring.node.metrics.updated',
      nodeId: 'node-a1',
      ts: '2026-07-12T09:13:00.000Z',
      bucketSec: 60,
      node: {
        cpuUsagePct: 84.1,
        memoryUsagePct: 76.8,
        diskUsagePct: 71.4,
        cpuTemperatureC: 81,
        networkRxBytesSec: 2510000,
        networkTxBytesSec: 1840000,
      },
      workloads: [
        {
          workloadId: 'container-api',
          cpuUsagePct: 47.3,
          memoryUsagePct: 39.1,
        },
      ],
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_NODE_METRICS_UPDATED_EVENT,
      expect.objectContaining({
        nodeId: 'node-a1',
        bucketSec: 60,
      }),
    );
  });

  it('emits node metrics workload membership changes on the expected event channel', async () => {
    const emit = jest.fn();
    const gateway = new MonitoringRealtimeGateway();

    Object.assign(gateway as object, {
      server: {
        emit,
      },
    });

    await gateway.emitNodeMetricsWorkloadsChanged({
      event: 'monitoring.node.metrics.workloads.changed',
      nodeId: 'node-a1',
      ts: '2026-07-12T09:13:00.000Z',
      workloadSummary: {
        total: 1,
        returned: 1,
        selectionMode: 'top_cpu_then_memory',
      },
      workloads: [
        {
          workloadId: 'container-api',
          workloadType: 'container',
          name: 'api',
          status: 'running',
          latestCpuUsagePct: 49.2,
          latestMemoryUsagePct: 39.8,
        },
      ],
    });

    expect(emit).toHaveBeenCalledWith(
      MONITORING_NODE_METRICS_WORKLOADS_CHANGED_EVENT,
      expect.objectContaining({
        nodeId: 'node-a1',
      }),
    );
  });
});
