import { describe, expect, it, jest } from '@jest/globals';

import type {
  NodeOverviewSnapshotRecord,
  NodeOverviewWorkloadRecord,
} from '../ports/node-overview-read.repository';
import {
  NodeOverviewComposerService,
  buildNodeOverviewChangedChannel,
  deriveNodeOverviewSeverity,
  deriveNodeOverviewStatus,
  selectOverviewWorkloads,
} from './node-overview-composer.service';
import type { CollectorLivenessService } from './collector-liveness.service';

describe('deriveNodeOverviewStatus', () => {
  const baseSnapshot: NodeOverviewSnapshotRecord = {
    nodeId: 'node-a1',
    summaryTs: '2026-07-10 10:00:00',
    fingerprintSeenAt: null,
    batteryModel: null,
    cpuArchitecture: null,
    cpuModel: null,
    gpuModelPrimary: null,
    hardwareSerial: null,
    logicalCpuCount: null,
    macAddress: null,
    motherboardModel: null,
    osProduct: null,
    primaryIpv4: null,
    ssdModelPrimary: null,
    maxSeverityCode: 0,
    hasOverrideFlag: 0,
    isAnyStale: 0,
    staleMetricCount: 0,
    criticalMetricCount: 0,
    warningMetricCount: 0,
    cpuUsagePctCurrent: 10,
    cpuUsagePctUnit: '%',
    memoryUsagePctCurrent: 20,
    memoryUsagePctUnit: '%',
    diskUsagePctCurrent: 30,
    diskUsagePctUnit: '%',
    cpuTemperatureCCurrent: 40,
    cpuTemperatureCUnit: 'C',
    cpuPackagePowerWCurrent: 75,
    cpuPackagePowerWUnit: 'W',
    networkRxBytesSecCurrent: 50,
    networkRxBytesSecUnit: 'bytes/sec',
    networkTxBytesSecCurrent: 60,
    networkTxBytesSecUnit: 'bytes/sec',
    primaryNicStatusCurrent: 'up',
    primaryNicStatusUnit: 'state',
    uptimeSecondsCurrent: 34880,
    uptimeSecondsUnit: 'seconds',
    worstMetricKey: null,
    worstMetricValueNumeric: null,
    worstMetricValueText: null,
  };

  it('returns healthy for non-stale snapshots without warnings', () => {
    expect(deriveNodeOverviewStatus(baseSnapshot, 1)).toBe('healthy');
    expect(deriveNodeOverviewSeverity(baseSnapshot, 1)).toBe('healthy');
  });

  it('returns alerting/high for critical snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      criticalMetricCount: 1,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('alerting');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('high');
  });

  it('returns alerting/warning for warning-only snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      warningMetricCount: 2,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('alerting');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('warning');
  });

  it('returns unknown/stale for stale-only snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      maxSeverityCode: 1,
      isAnyStale: 1,
      staleMetricCount: 4,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('unknown');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('stale');
  });

  it('returns critical severity when the node has fully lost observability', () => {
    const snapshot = {
      ...baseSnapshot,
      maxSeverityCode: 4,
      isAnyStale: 1,
      staleMetricCount: 2,
    };

    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('critical');
  });
});

describe('selectOverviewWorkloads', () => {
  it('prioritizes abnormal workloads and then sorts by cpu and memory usage', () => {
    const workloads: NodeOverviewWorkloadRecord[] = [
      {
        workloadId: '1',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'cpu-heavy',
        serviceName: 'svc-a',
        status: 'running',
        healthStatus: 'healthy',
        cpuUsagePct: 95,
        memoryUsagePct: 30,
        restartCount: 0,
        pidCount: 10,
        worstMetricKey: null,
        isAnyStale: 0,
      },
      {
        workloadId: '2',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'unhealthy',
        serviceName: 'svc-b',
        status: 'running',
        healthStatus: 'unhealthy',
        cpuUsagePct: 1,
        memoryUsagePct: 1,
        restartCount: 0,
        pidCount: 10,
        worstMetricKey: null,
        isAnyStale: 0,
      },
      {
        workloadId: '3',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'restarting',
        serviceName: 'svc-c',
        status: 'running',
        healthStatus: 'healthy',
        cpuUsagePct: 20,
        memoryUsagePct: 10,
        restartCount: 2,
        pidCount: 10,
        worstMetricKey: null,
        isAnyStale: 0,
      },
    ];

    expect(selectOverviewWorkloads(workloads).map((workload) => workload.workloadId)).toEqual([
      '3',
      '2',
      '1',
    ]);
  });
});

describe('buildNodeOverviewChangedChannel', () => {
  it('builds a node-specific overview changed channel', () => {
    expect(buildNodeOverviewChangedChannel('node-a1')).toBe(
      'monitoring.node.node-a1.overview.changed',
    );
  });
});

describe('NodeOverviewComposerService', () => {
  it('includes uptimeBySeconds in summary metrics', async () => {
    const snapshot: NodeOverviewSnapshotRecord = {
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      fingerprintSeenAt: null,
      batteryModel: null,
      cpuArchitecture: null,
      cpuModel: null,
      gpuModelPrimary: null,
      hardwareSerial: null,
      logicalCpuCount: null,
      macAddress: null,
      motherboardModel: null,
      osProduct: null,
      primaryIpv4: null,
      ssdModelPrimary: null,
      maxSeverityCode: 0,
      hasOverrideFlag: 0,
      isAnyStale: 0,
      staleMetricCount: 0,
      criticalMetricCount: 0,
      warningMetricCount: 0,
      cpuUsagePctCurrent: 10,
      cpuUsagePctUnit: '%',
      memoryUsagePctCurrent: 20,
      memoryUsagePctUnit: '%',
      diskUsagePctCurrent: 30,
      diskUsagePctUnit: '%',
      cpuTemperatureCCurrent: 40,
      cpuTemperatureCUnit: 'C',
      cpuPackagePowerWCurrent: 75,
      cpuPackagePowerWUnit: 'W',
      networkRxBytesSecCurrent: 50,
      networkRxBytesSecUnit: 'bytes/sec',
      networkTxBytesSecCurrent: 60,
      networkTxBytesSecUnit: 'bytes/sec',
      primaryNicStatusCurrent: 'up',
      primaryNicStatusUnit: 'state',
      uptimeSecondsCurrent: 34880,
      uptimeSecondsUnit: 'seconds',
      worstMetricKey: null,
      worstMetricValueNumeric: null,
      worstMetricValueText: null,
    };
    const repository = {
      getCurrentNode: jest.fn().mockResolvedValue(snapshot),
      listNodeWorkloads: jest.fn().mockResolvedValue([]),
    };
    const collectorLivenessService = {
      getByNodeId: jest.fn().mockResolvedValue({
        nodeId: 'node-a1',
        agentId: 'node-a1',
        collectorStatus: 'ONLINE',
        lastHeartbeatAt: '2026-07-21T08:15:30.000Z',
        collectorFreshnessSec: 12,
        heartbeatTimeoutSec: 90,
        source: 'go-agent-collector',
        metricKey: 'agent.heartbeat',
        sourceMetric: 'collector.runtime.heartbeat',
      }),
    };
    const service = new NodeOverviewComposerService(
      repository as never,
      collectorLivenessService as unknown as CollectorLivenessService,
    );

    const overview = await service.buildOverview('node-a1');

    expect(overview.summaryMetrics.uptimeBySeconds).toEqual({
      value: 34880,
      unit: 'seconds',
    });
    expect(overview.node.collectorStatus).toBe('ONLINE');
    expect(overview.node.heartbeatTimeoutSec).toBe(90);
  });
});
