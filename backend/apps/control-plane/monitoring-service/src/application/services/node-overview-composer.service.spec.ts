import { describe, expect, it, jest } from '@jest/globals';

import type {
  NodeOverviewSnapshotRecord,
  NodeOverviewWorkloadRecord,
} from '../ports/node-overview-read.repository';
import {
  NodeOverviewComposerService,
  buildNodeOverviewChangedChannel,
  deriveNodeOverviewHealth,
  deriveNodeOverviewStatus,
  selectOverviewWorkloads,
} from './node-overview-composer.service';

const ONLINE_HEARTBEAT_AT = '2999-01-01T00:00:00.000Z';
const ONLINE_HEARTBEAT_AT_OPERATOR = '2999-01-01T07:00:00.000+07:00';
const STALE_HEARTBEAT_AT = '2026-07-21T08:15:30.000Z';
const STALE_HEARTBEAT_AT_OPERATOR = '2026-07-21T15:15:30.000+07:00';
const monitoringConfig = { collectorHeartbeatTimeoutSec: 90 };

describe('deriveNodeOverviewHealth', () => {
  const baseSnapshot: NodeOverviewSnapshotRecord = {
    nodeId: 'node-a1',
    summaryTs: '2026-07-10 10:00:00',
    collectorHeartbeatAt: ONLINE_HEARTBEAT_AT,
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

  it('returns healthy with no reason for non-stale snapshots without warnings', () => {
    expect(deriveNodeOverviewStatus(baseSnapshot, 1)).toBe('healthy');
    expect(deriveNodeOverviewHealth(baseSnapshot, 1)).toEqual({
      status: 'healthy',
      reason: 'none',
    });
  });

  it('returns critical when critical metrics are present', () => {
    const snapshot = {
      ...baseSnapshot,
      criticalMetricCount: 1,
    };

    expect(deriveNodeOverviewHealth(snapshot, 1)).toEqual({
      status: 'critical',
      reason: 'critical_metric',
    });
  });

  it('returns warning when warning-only metrics are present', () => {
    const snapshot = {
      ...baseSnapshot,
      warningMetricCount: 2,
    };

    expect(deriveNodeOverviewHealth(snapshot, 1)).toEqual({
      status: 'warning',
      reason: 'warning_metric',
    });
  });

  it('returns unknown when stale-only telemetry cannot support a health judgment', () => {
    const snapshot = {
      ...baseSnapshot,
      maxSeverityCode: 1,
      isAnyStale: 1,
      staleMetricCount: 4,
    };

    expect(deriveNodeOverviewStatus(snapshot, 1)).toBe('unknown');
    expect(deriveNodeOverviewHealth(snapshot, 1)).toEqual({
      status: 'unknown',
      reason: 'telemetry_stale',
    });
  });

  it('keeps full observability loss unknown instead of reporting fake critical health', () => {
    const snapshot = {
      ...baseSnapshot,
      maxSeverityCode: 4,
      isAnyStale: 1,
      staleMetricCount: 2,
    };

    expect(deriveNodeOverviewHealth(snapshot, 1)).toEqual({
      status: 'unknown',
      reason: 'telemetry_stale',
    });
  });

  it('returns no telemetry when the summary timestamp is not usable', () => {
    expect(
      deriveNodeOverviewHealth(
        {
          ...baseSnapshot,
          summaryTs: 'not-a-date',
        },
        0,
      ),
    ).toEqual({
      status: 'unknown',
      reason: 'no_telemetry',
    });
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

    expect(
      selectOverviewWorkloads(workloads).map((workload) => workload.workloadId),
    ).toEqual(['3', '2', '1']);
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
  it('returns canonical node and collector status reasons', async () => {
    const snapshot: NodeOverviewSnapshotRecord = {
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      collectorHeartbeatAt: ONLINE_HEARTBEAT_AT,
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
    const service = new NodeOverviewComposerService(
      repository as never,
      monitoringConfig as never,
    );

    const overview = await service.buildOverview('node-a1');

    expect(overview.node).toEqual(
      expect.objectContaining({
        nodeId: 'node-a1',
        status: 'healthy',
        reason: 'none',
        lastSeenAt: '2026-07-10T17:00:00.000+07:00',
        collector: {
          status: 'online',
          reason: 'none',
          lastHeartbeatAt: ONLINE_HEARTBEAT_AT_OPERATOR,
          heartbeatTimeoutSec: 90,
        },
      }),
    );
    expect(overview.node.hardware).toEqual({
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
    });
    expect(overview.node).not.toHaveProperty('severity');
    expect(overview.node).not.toHaveProperty('freshnessSec');
    expect(overview.node).not.toHaveProperty('collectorStatus');
    expect(overview.node).not.toHaveProperty('collectorFreshnessSec');
    expect(overview.summaryMetrics).toEqual({
      primaryNicStatus: 'up',
      uptimeSec: 34880,
      primaryIssue: {
        type: 'none',
        metricKey: null,
        value: null,
      },
      alertCounters: {
        critical: 0,
        warning: 0,
        stale: 0,
      },
    });
    expect(overview.summaryMetrics).not.toHaveProperty('uptimeBySeconds');
    expect(overview.summaryMetrics).not.toHaveProperty('worstMetric');
  });

  it('maps stale and missing ClickHouse collector heartbeat into nested reasons', async () => {
    const snapshot: NodeOverviewSnapshotRecord = {
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      collectorHeartbeatAt: STALE_HEARTBEAT_AT,
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
      cpuUsagePctCurrent: null,
      cpuUsagePctUnit: null,
      memoryUsagePctCurrent: null,
      memoryUsagePctUnit: null,
      diskUsagePctCurrent: null,
      diskUsagePctUnit: null,
      cpuTemperatureCCurrent: null,
      cpuTemperatureCUnit: null,
      cpuPackagePowerWCurrent: null,
      cpuPackagePowerWUnit: null,
      networkRxBytesSecCurrent: null,
      networkRxBytesSecUnit: null,
      networkTxBytesSecCurrent: null,
      networkTxBytesSecUnit: null,
      primaryNicStatusCurrent: null,
      primaryNicStatusUnit: null,
      uptimeSecondsCurrent: null,
      uptimeSecondsUnit: null,
      worstMetricKey: null,
      worstMetricValueNumeric: null,
      worstMetricValueText: null,
    };
    const repository = {
      getCurrentNode: jest
        .fn()
        .mockResolvedValueOnce(snapshot)
        .mockResolvedValueOnce({
          ...snapshot,
          collectorHeartbeatAt: null,
        }),
      listNodeWorkloads: jest.fn().mockResolvedValue([]),
    };
    const service = new NodeOverviewComposerService(
      repository as never,
      monitoringConfig as never,
    );

    await expect(service.buildOverview('node-a1')).resolves.toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          collector: {
            status: 'offline',
            reason: 'heartbeat_timeout',
            lastHeartbeatAt: STALE_HEARTBEAT_AT_OPERATOR,
            heartbeatTimeoutSec: 90,
          },
        }),
      }),
    );
    await expect(service.buildOverview('node-a1')).resolves.toEqual(
      expect.objectContaining({
        node: expect.objectContaining({
          collector: {
            status: 'unknown',
            reason: 'no_heartbeat',
            lastHeartbeatAt: null,
            heartbeatTimeoutSec: 90,
          },
        }),
      }),
    );
  });

  it('returns simplified summary metrics with a primary issue', async () => {
    const snapshot: NodeOverviewSnapshotRecord = {
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      collectorHeartbeatAt: ONLINE_HEARTBEAT_AT,
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
      staleMetricCount: 3,
      criticalMetricCount: 1,
      warningMetricCount: 2,
      cpuUsagePctCurrent: null,
      cpuUsagePctUnit: null,
      memoryUsagePctCurrent: null,
      memoryUsagePctUnit: null,
      diskUsagePctCurrent: null,
      diskUsagePctUnit: null,
      cpuTemperatureCCurrent: null,
      cpuTemperatureCUnit: null,
      cpuPackagePowerWCurrent: null,
      cpuPackagePowerWUnit: null,
      networkRxBytesSecCurrent: null,
      networkRxBytesSecUnit: null,
      networkTxBytesSecCurrent: null,
      networkTxBytesSecUnit: null,
      primaryNicStatusCurrent: 'dormant',
      primaryNicStatusUnit: 'state',
      uptimeSecondsCurrent: 31637.173,
      uptimeSecondsUnit: 'seconds',
      worstMetricKey: 'node.heartbeat.loss',
      worstMetricValueNumeric: 0,
      worstMetricValueText: 'PING_TIMEOUT',
    };
    const repository = {
      getCurrentNode: jest.fn().mockResolvedValue(snapshot),
      listNodeWorkloads: jest.fn().mockResolvedValue([]),
    };
    const service = new NodeOverviewComposerService(
      repository as never,
      monitoringConfig as never,
    );

    const overview = await service.buildOverview('node-a1');

    expect(overview.summaryMetrics).toEqual({
      primaryNicStatus: 'dormant',
      uptimeSec: 31637.173,
      primaryIssue: {
        type: 'heartbeat_loss',
        metricKey: 'node.heartbeat.loss',
        value: 'PING_TIMEOUT',
      },
      alertCounters: {
        critical: 1,
        warning: 2,
        stale: 3,
      },
    });
  });

  it('returns clean workload contract without counting unknown runtime as unhealthy', async () => {
    const snapshot: NodeOverviewSnapshotRecord = {
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      collectorHeartbeatAt: ONLINE_HEARTBEAT_AT,
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
      cpuUsagePctCurrent: null,
      cpuUsagePctUnit: null,
      memoryUsagePctCurrent: null,
      memoryUsagePctUnit: null,
      diskUsagePctCurrent: null,
      diskUsagePctUnit: null,
      cpuTemperatureCCurrent: null,
      cpuTemperatureCUnit: null,
      cpuPackagePowerWCurrent: null,
      cpuPackagePowerWUnit: null,
      networkRxBytesSecCurrent: null,
      networkRxBytesSecUnit: null,
      networkTxBytesSecCurrent: null,
      networkTxBytesSecUnit: null,
      primaryNicStatusCurrent: null,
      primaryNicStatusUnit: null,
      uptimeSecondsCurrent: null,
      uptimeSecondsUnit: null,
      worstMetricKey: null,
      worstMetricValueNumeric: null,
      worstMetricValueText: null,
    };
    const workloads: NodeOverviewWorkloadRecord[] = [
      {
        workloadId: 'healthy-1',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'healthy-api',
        serviceName: 'api',
        status: 'running',
        healthStatus: 'healthy',
        cpuUsagePct: 10,
        memoryUsagePct: 20,
        restartCount: 0,
        pidCount: 5,
        worstMetricKey: null,
        isAnyStale: 0,
      },
      {
        workloadId: 'unhealthy-1',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'bad-worker',
        serviceName: 'worker',
        status: 'exited',
        healthStatus: 'unhealthy',
        cpuUsagePct: 5,
        memoryUsagePct: 10,
        restartCount: 0,
        pidCount: 0,
        worstMetricKey: 'container.health_status',
        isAnyStale: 0,
      },
      {
        workloadId: 'unknown-1',
        workloadType: 'container',
        summaryTs: '2026-07-10 10:00:00',
        nodeId: 'node-a1',
        name: 'unknown-cache',
        serviceName: 'cache',
        status: 'unknown',
        healthStatus: 'unknown',
        cpuUsagePct: 1,
        memoryUsagePct: 1,
        restartCount: 0,
        pidCount: 0,
        worstMetricKey: 'container.heartbeat.loss',
        isAnyStale: 1,
      },
    ];
    const repository = {
      getCurrentNode: jest.fn().mockResolvedValue(snapshot),
      listNodeWorkloads: jest.fn().mockResolvedValue(workloads),
    };
    const service = new NodeOverviewComposerService(
      repository as never,
      monitoringConfig as never,
    );

    const overview = await service.buildOverview('node-a1');

    expect(overview.workloadSummary).toEqual({
      total: 3,
      healthy: 1,
      unhealthy: 1,
    });
    expect(overview.workloadSummary).not.toHaveProperty('nonRunning');
    expect(overview.workloadSummary).not.toHaveProperty('returned');
    expect(overview.workloadSummary).not.toHaveProperty('selectionMode');
    expect(overview.workloads).toEqual([
      {
        workloadId: 'unhealthy-1',
        type: 'container',
        name: 'bad-worker',
        status: 'stopped',
        healthStatus: 'unhealthy',
        restartCount: 0,
        primaryIssue: {
          type: 'metric_alert',
          metricKey: 'container.health_status',
        },
      },
      {
        workloadId: 'unknown-1',
        type: 'container',
        name: 'unknown-cache',
        status: 'unknown',
        healthStatus: 'unknown',
        restartCount: 0,
        primaryIssue: {
          type: 'heartbeat_loss',
          metricKey: 'container.heartbeat.loss',
        },
      },
      {
        workloadId: 'healthy-1',
        type: 'container',
        name: 'healthy-api',
        status: 'running',
        healthStatus: 'healthy',
        restartCount: 0,
        primaryIssue: {
          type: 'none',
          metricKey: null,
        },
      },
    ]);
    expect(overview.workloads[0]).not.toHaveProperty('workloadType');
    expect(overview.workloads[0]).not.toHaveProperty('serviceName');
    expect(overview.workloads[0]).not.toHaveProperty('worstMetricKey');
    expect(overview.workloads[0]).not.toHaveProperty('isAbnormal');
  });
});
