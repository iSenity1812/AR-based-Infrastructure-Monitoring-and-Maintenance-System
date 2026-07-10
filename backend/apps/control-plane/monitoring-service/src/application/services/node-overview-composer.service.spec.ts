import { describe, expect, it } from '@jest/globals';

import type {
  NodeOverviewSnapshotRecord,
  NodeOverviewWorkloadRecord,
} from '../ports/node-overview-read.repository';
import {
  deriveNodeOverviewSeverity,
  deriveNodeOverviewStatus,
  selectOverviewWorkloads,
} from './node-overview-composer.service';

describe('deriveNodeOverviewStatus', () => {
  const baseSnapshot: NodeOverviewSnapshotRecord = {
    nodeId: 'node-a1',
    summaryTs: '2026-07-10 10:00:00',
    maxSeverityCode: 0,
    hasOverrideFlag: 0,
    isAnyStale: 0,
    staleMetricCount: 0,
    criticalMetricCount: 0,
    warningMetricCount: 0,
    cpuUsagePctCurrent: 10,
    memoryUsagePctCurrent: 20,
    diskUsagePctCurrent: 30,
    cpuTemperatureCCurrent: 40,
    networkRxBytesSecCurrent: 50,
    networkTxBytesSecCurrent: 60,
    primaryNicStatusCurrent: 'up',
    worstMetricKey: null,
    worstMetricValueNumeric: null,
    worstMetricValueText: null,
  };

  it('returns healthy for non-stale snapshots without warnings', () => {
    expect(deriveNodeOverviewStatus(baseSnapshot, 1)).toBe('healthy');
    expect(deriveNodeOverviewSeverity(baseSnapshot, 1)).toBe('none');
  });

  it('returns alerting/high for critical snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      criticalMetricCount: 1,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('alerting');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('high');
  });

  it('returns alerting/medium for warning-only snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      warningMetricCount: 2,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('alerting');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('medium');
  });

  it('returns unknown for stale-only snapshots', () => {
    const snapshot = {
      ...baseSnapshot,
      isAnyStale: 1,
      staleMetricCount: 4,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('unknown');
    expect(deriveNodeOverviewSeverity(snapshot, 1)).toBe('unknown');
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
