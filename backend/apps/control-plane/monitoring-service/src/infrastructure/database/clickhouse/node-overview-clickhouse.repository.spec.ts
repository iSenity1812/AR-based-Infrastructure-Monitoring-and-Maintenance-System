import { describe, expect, it, jest } from '@jest/globals';

import {
  NodeOverviewClickhouseRepository,
  mapNodeOverviewSnapshotRow,
  mapNodeOverviewWorkloadRow,
} from './node-overview-clickhouse.repository';

describe('mapNodeOverviewSnapshotRow', () => {
  it('normalizes nullable numeric ClickHouse fields for node overview snapshots', () => {
    const record = mapNodeOverviewSnapshotRow({
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      fingerprintSeenAt: '2026-07-10 09:59:30',
      batteryModel: 'MS-158L',
      cpuArchitecture: '386',
      cpuModel: 'AMD Ryzen 7 5800H with Radeon Graphics',
      gpuModelPrimary: 'AMD Radeon(TM) Graphics',
      hardwareSerial: 'BSS-0123456789',
      logicalCpuCount: '16',
      macAddress: '50:C2:E8:0B:14:A5',
      motherboardModel: 'MSI MS-158L',
      osProduct: 'Windows 11',
      primaryIpv4: '192.168.1.2',
      ssdModelPrimary: 'KINGSTON SNV2S1000G',
      maxSeverityCode: '3',
      hasOverrideFlag: '1',
      isAnyStale: '0',
      staleMetricCount: '0',
      criticalMetricCount: '2',
      warningMetricCount: '1',
      cpuUsagePctCurrent: '80.2',
      cpuUsagePctUnit: '%',
      memoryUsagePctCurrent: null,
      memoryUsagePctUnit: '%',
      diskUsagePctCurrent: '75.1',
      diskUsagePctUnit: '%',
      cpuTemperatureCCurrent: '92',
      cpuTemperatureCUnit: 'C',
      cpuPackagePowerWCurrent: '110.5',
      cpuPackagePowerWUnit: 'W',
      networkRxBytesSecCurrent: '12.5',
      networkRxBytesSecUnit: 'bytes/sec',
      networkTxBytesSecCurrent: '6.3',
      networkTxBytesSecUnit: 'bytes/sec',
      primaryNicStatusCurrent: 'dormant',
      primaryNicStatusUnit: 'state',
      worstMetricKey: 'node.cpu_temperature_c',
      worstMetricValueNumeric: '92',
      worstMetricValueText: '92',
    });

    expect(record).toEqual({
      nodeId: 'node-a1',
      summaryTs: '2026-07-10 10:00:00',
      fingerprintSeenAt: '2026-07-10 09:59:30',
      batteryModel: 'MS-158L',
      cpuArchitecture: '386',
      cpuModel: 'AMD Ryzen 7 5800H with Radeon Graphics',
      gpuModelPrimary: 'AMD Radeon(TM) Graphics',
      hardwareSerial: 'BSS-0123456789',
      logicalCpuCount: 16,
      macAddress: '50:C2:E8:0B:14:A5',
      motherboardModel: 'MSI MS-158L',
      osProduct: 'Windows 11',
      primaryIpv4: '192.168.1.2',
      ssdModelPrimary: 'KINGSTON SNV2S1000G',
      maxSeverityCode: 3,
      hasOverrideFlag: 1,
      isAnyStale: 0,
      staleMetricCount: 0,
      criticalMetricCount: 2,
      warningMetricCount: 1,
      cpuUsagePctCurrent: 80.2,
      cpuUsagePctUnit: '%',
      memoryUsagePctCurrent: null,
      memoryUsagePctUnit: '%',
      diskUsagePctCurrent: 75.1,
      diskUsagePctUnit: '%',
      cpuTemperatureCCurrent: 92,
      cpuTemperatureCUnit: 'C',
      cpuPackagePowerWCurrent: 110.5,
      cpuPackagePowerWUnit: 'W',
      networkRxBytesSecCurrent: 12.5,
      networkRxBytesSecUnit: 'bytes/sec',
      networkTxBytesSecCurrent: 6.3,
      networkTxBytesSecUnit: 'bytes/sec',
      primaryNicStatusCurrent: 'dormant',
      primaryNicStatusUnit: 'state',
      worstMetricKey: 'node.cpu_temperature_c',
      worstMetricValueNumeric: 92,
      worstMetricValueText: '92',
    });
  });
});

describe('mapNodeOverviewWorkloadRow', () => {
  it('normalizes workload rows for overview ranking and presentation', () => {
    const record = mapNodeOverviewWorkloadRow({
      workloadId: 'container-1',
      workloadType: 'container',
      summaryTs: '2026-07-10 10:00:00',
      nodeId: 'node-a1',
      name: 'vector',
      serviceName: 'vector',
      status: 'running',
      healthStatus: 'unhealthy',
      cpuUsagePct: '12.3',
      memoryUsagePct: '4.5',
      restartCount: '2',
      pidCount: '11',
      worstMetricKey: 'container.health_status',
      isAnyStale: '0',
    });

    expect(record).toEqual({
      workloadId: 'container-1',
      workloadType: 'container',
      summaryTs: '2026-07-10 10:00:00',
      nodeId: 'node-a1',
      name: 'vector',
      serviceName: 'vector',
      status: 'running',
      healthStatus: 'unhealthy',
      cpuUsagePct: 12.3,
      memoryUsagePct: 4.5,
      restartCount: 2,
      pidCount: 11,
      worstMetricKey: 'container.health_status',
      isAnyStale: 0,
    });
  });
});

describe('NodeOverviewClickhouseRepository incremental change detection', () => {
  it('queries node snapshots with the current node_current_summary aliases', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new NodeOverviewClickhouseRepository({
      query,
    } as never);

    await repository.getCurrentNode('node-a1');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          nodeId: 'node-a1',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'LEFT JOIN telemetry_db.node_fingerprint_latest AS fingerprint',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'fingerprint.cpu_model AS cpuModel',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'overall_health_code AS maxSeverityCode',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'cpu_temperature_c_max_current AS cpuTemperatureCCurrent',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'cpu_package_power_w_current AS cpuPackagePowerWCurrent',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'cpu_usage_pct_unit AS cpuUsagePctUnit',
    );
  });

  it('queries changed node ids across node and workload summaries with checkpoint ordering', async () => {
    const json = jest.fn().mockResolvedValue([]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new NodeOverviewClickhouseRepository({
      query,
    } as never);

    await repository.listChangedNodeIdsSince('2026-07-10 10:00:00');

    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'JSONEachRow',
        query_params: {
          changedSinceSummaryTs: '2026-07-10 10:00:00',
        },
      }),
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.node_current_summary',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.container_current_summary',
    );
    expect(query.mock.calls[0][0].query).toContain(
      'FROM telemetry_db.node_fingerprint_latest',
    );
  });

  it('includes fingerprint latest timestamps in the overview checkpoint calculation', async () => {
    const json = jest.fn().mockResolvedValue([
      { latestSummaryTs: '2026-07-10 10:00:00' },
    ]);
    const query = jest.fn().mockResolvedValue({ json });
    const repository = new NodeOverviewClickhouseRepository({
      query,
    } as never);

    await repository.getLatestNodeChangeSummaryTs();

    expect(query.mock.calls[0][0].query).toContain(
      'SELECT max(latest_ts) FROM telemetry_db.node_fingerprint_latest',
    );
    expect(query.mock.calls[0][0].query).toContain(
      "max(toTimeZone(summary_ts, 'UTC'))",
    );
    expect(query.mock.calls[0][0].query).toContain(
      "formatDateTime(",
    );
  });
});
