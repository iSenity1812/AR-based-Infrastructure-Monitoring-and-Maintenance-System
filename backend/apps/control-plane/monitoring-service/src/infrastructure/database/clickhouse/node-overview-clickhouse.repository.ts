import { type ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';

import {
  NodeOverviewReadRepository,
  type NodeOverviewSnapshotRecord,
  type NodeOverviewWorkloadRecord,
} from '../../../application/ports/node-overview-read.repository';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';

type NodeOverviewSnapshotRow = {
  nodeId: string;
  summaryTs: string;
  collectorHeartbeatAt: string | null;
  batteryModel: string | null;
  cpuArchitecture: string | null;
  cpuModel: string | null;
  gpuModelPrimary: string | null;
  hardwareSerial: string | null;
  logicalCpuCount: number | string | null;
  macAddress: string | null;
  motherboardModel: string | null;
  osProduct: string | null;
  primaryIpv4: string | null;
  ssdModelPrimary: string | null;
  maxSeverityCode: number | string;
  hasOverrideFlag: number | string;
  isAnyStale: number | string;
  staleMetricCount: number | string;
  criticalMetricCount: number | string;
  warningMetricCount: number | string;
  cpuUsagePctCurrent: number | string | null;
  cpuUsagePctUnit: string | null;
  memoryUsagePctCurrent: number | string | null;
  memoryUsagePctUnit: string | null;
  diskUsagePctCurrent: number | string | null;
  diskUsagePctUnit: string | null;
  cpuTemperatureCCurrent: number | string | null;
  cpuTemperatureCUnit: string | null;
  cpuPackagePowerWCurrent: number | string | null;
  cpuPackagePowerWUnit: string | null;
  networkRxBytesSecCurrent: number | string | null;
  networkRxBytesSecUnit: string | null;
  networkTxBytesSecCurrent: number | string | null;
  networkTxBytesSecUnit: string | null;
  primaryNicStatusCurrent: string | null;
  primaryNicStatusUnit: string | null;
  uptimeSecondsCurrent: number | string | null;
  uptimeSecondsUnit: string | null;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | string | null;
  worstMetricValueText: string | null;
};

type NodeOverviewWorkloadRow = {
  workloadId: string;
  workloadType: 'container';
  summaryTs: string;
  nodeId: string;
  name: string;
  serviceName: string;
  status: string;
  healthStatus: string;
  cpuUsagePct: number | string | null;
  memoryUsagePct: number | string | null;
  restartCount: number | string;
  pidCount: number | string;
  worstMetricKey: string | null;
  isAnyStale: number | string;
};

type LatestSummaryTsRow = {
  latestSummaryTs: string | null;
};

type ChangedNodeIdRow = {
  nodeId: string;
};

@Injectable()
export class NodeOverviewClickhouseRepository implements NodeOverviewReadRepository {
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async getCurrentNode(
    nodeId: string,
  ): Promise<NodeOverviewSnapshotRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          summary.node_id AS nodeId,
          formatDateTime(
            toTimeZone(summary.summary_ts, 'UTC'),
            '%FT%TZ',
            'UTC'
          ) AS summaryTs,
          heartbeat.collectorHeartbeatAt AS collectorHeartbeatAt,
          fingerprint.battery_model AS batteryModel,
          fingerprint.cpu_architecture AS cpuArchitecture,
          fingerprint.cpu_model AS cpuModel,
          fingerprint.gpu_model_primary AS gpuModelPrimary,
          fingerprint.hardware_serial AS hardwareSerial,
          fingerprint.logical_cpu_count AS logicalCpuCount,
          fingerprint.mac_address AS macAddress,
          fingerprint.motherboard_model AS motherboardModel,
          fingerprint.os_product AS osProduct,
          fingerprint.primary_ipv4 AS primaryIpv4,
          fingerprint.ssd_model_primary AS ssdModelPrimary,
          summary.overall_health_code AS maxSeverityCode,
          summary.has_override_flag AS hasOverrideFlag,
          summary.is_any_stale AS isAnyStale,
          summary.stale_metric_count AS staleMetricCount,
          summary.critical_metric_count AS criticalMetricCount,
          summary.warning_metric_count AS warningMetricCount,
          summary.cpu_usage_pct_current AS cpuUsagePctCurrent,
          summary.cpu_usage_pct_unit AS cpuUsagePctUnit,
          summary.memory_used_pct_current AS memoryUsagePctCurrent,
          summary.memory_used_pct_unit AS memoryUsagePctUnit,
          summary.disk_used_pct_max_current AS diskUsagePctCurrent,
          summary.disk_used_pct_unit AS diskUsagePctUnit,
          summary.cpu_temperature_c_max_current AS cpuTemperatureCCurrent,
          summary.cpu_temperature_c_unit AS cpuTemperatureCUnit,
          summary.cpu_package_power_w_current AS cpuPackagePowerWCurrent,
          summary.cpu_package_power_w_unit AS cpuPackagePowerWUnit,
          summary.network_rx_bytes_sec_sum_current AS networkRxBytesSecCurrent,
          summary.network_rx_bytes_sec_unit AS networkRxBytesSecUnit,
          summary.network_tx_bytes_sec_sum_current AS networkTxBytesSecCurrent,
          summary.network_tx_bytes_sec_unit AS networkTxBytesSecUnit,
          summary.primary_nic_status_current AS primaryNicStatusCurrent,
          summary.primary_nic_status_unit AS primaryNicStatusUnit,
          summary.uptime_seconds_current AS uptimeSecondsCurrent,
          summary.uptime_seconds_unit AS uptimeSecondsUnit,
          summary.worst_metric_key AS worstMetricKey,
          summary.worst_metric_numeric_value AS worstMetricValueNumeric,
          summary.worst_metric_text_value AS worstMetricValueText
        FROM telemetry_db.node_current_summary AS summary
        LEFT JOIN telemetry_db.node_fingerprint_latest AS fingerprint
          ON summary.node_id = fingerprint.node_id
        LEFT JOIN (
          SELECT
            node_id AS nodeId,
            formatDateTime(
              toTimeZone(max(latest_ts), 'UTC'),
              '%FT%TZ',
              'UTC'
            ) AS collectorHeartbeatAt
          FROM telemetry_db.node_current_live
          WHERE metric_key = 'agent.heartbeat'
          GROUP BY node_id
        ) AS heartbeat
          ON summary.node_id = heartbeat.nodeId
        WHERE summary.node_id = {nodeId: String}
        LIMIT 1
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeOverviewSnapshotRow>();
    return rows[0] ? mapNodeOverviewSnapshotRow(rows[0]) : null;
  }

  async listNodeWorkloads(
    nodeId: string,
  ): Promise<NodeOverviewWorkloadRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          container_id AS workloadId,
          'container' AS workloadType,
          formatDateTime(
            toTimeZone(summary_ts, 'UTC'),
            '%FT%TZ',
            'UTC'
          ) AS summaryTs,
          node_id AS nodeId,
          container_name AS name,
          service_name AS serviceName,
          container_state AS status,
          container_health_status AS healthStatus,
          cpu_usage_pct_current AS cpuUsagePct,
          memory_used_pct_current AS memoryUsagePct,
          restart_count_current AS restartCount,
          pid_count_current AS pidCount,
          worst_metric_key AS worstMetricKey,
          is_any_stale AS isAnyStale
        FROM telemetry_db.container_current_summary
        WHERE node_id = {nodeId: String}
          AND container_id IS NOT NULL
          AND container_id != ''
        ORDER BY
          summary_ts DESC,
          cpu_usage_pct_current DESC,
          memory_used_pct_current DESC,
          container_id ASC
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeOverviewWorkloadRow>();
    return rows.map(mapNodeOverviewWorkloadRow);
  }

  async getLatestNodeChangeSummaryTs(): Promise<string | null> {
    const result = await this.clickhouseClient.query({
      query: `
        WITH
          ifNull(
            (
              SELECT max(toTimeZone(summary_ts, 'UTC'))
              FROM telemetry_db.node_current_summary
            ),
            toDateTime(0)
          ) AS nodeMaxSummaryTs,
          ifNull(
            (
              SELECT max(toTimeZone(summary_ts, 'UTC'))
              FROM telemetry_db.container_current_summary
            ),
            toDateTime(0)
          ) AS workloadMaxSummaryTs,
          ifNull(
            (SELECT max(latest_ts) FROM telemetry_db.node_fingerprint_latest),
            toDateTime(0)
          ) AS fingerprintMaxSummaryTs
        SELECT formatDateTime(
          greatest(
            nodeMaxSummaryTs,
            workloadMaxSummaryTs,
            fingerprintMaxSummaryTs
          ),
          '%F %T',
          'UTC'
        ) AS latestSummaryTs
      `,
      format: 'JSONEachRow',
    });

    const rows = await result.json<LatestSummaryTsRow>();
    const latestSummaryTs = rows[0]?.latestSummaryTs?.trim();
    if (!latestSummaryTs || latestSummaryTs === '1970-01-01 00:00:00') {
      return null;
    }

    return latestSummaryTs;
  }

  async listChangedNodeIdsSince(summaryTs: string): Promise<string[]> {
    const result = await this.clickhouseClient.query({
      query: `
        WITH parseDateTimeBestEffort({changedSinceSummaryTs: String}, 'UTC') AS changedSinceSummaryTsUtc
        SELECT DISTINCT nodeId
        FROM (
          SELECT node_id AS nodeId
          FROM telemetry_db.node_current_summary
          WHERE toTimeZone(summary_ts, 'UTC') > changedSinceSummaryTsUtc

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.container_current_summary
          WHERE toTimeZone(summary_ts, 'UTC') > changedSinceSummaryTsUtc

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.node_fingerprint_latest
          WHERE latest_ts > changedSinceSummaryTsUtc
        )
        WHERE nodeId IS NOT NULL
          AND nodeId != ''
          AND lower(trim(nodeId)) != 'null'
          AND lower(trim(nodeId)) != 'undefined'
        ORDER BY nodeId ASC
      `,
      query_params: {
        changedSinceSummaryTs: summaryTs,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<ChangedNodeIdRow>();
    return rows.map((row) => row.nodeId);
  }

  async listNodeIdsForOverviewSync(): Promise<string[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT DISTINCT nodeId
        FROM (
          SELECT node_id AS nodeId
          FROM telemetry_db.node_current_summary

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.container_current_summary

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.node_fingerprint_latest
        )
        WHERE nodeId IS NOT NULL
          AND nodeId != ''
          AND lower(trim(nodeId)) != 'null'
          AND lower(trim(nodeId)) != 'undefined'
        ORDER BY nodeId ASC
      `,
      format: 'JSONEachRow',
    });

    const rows = await result.json<ChangedNodeIdRow>();
    return rows.map((row) => row.nodeId);
  }
}

export function mapNodeOverviewSnapshotRow(
  row: NodeOverviewSnapshotRow,
): NodeOverviewSnapshotRecord {
  return {
    nodeId: row.nodeId,
    summaryTs: row.summaryTs,
    collectorHeartbeatAt: toNullableString(row.collectorHeartbeatAt),
    batteryModel: toNullableString(row.batteryModel),
    cpuArchitecture: toNullableString(row.cpuArchitecture),
    cpuModel: toNullableString(row.cpuModel),
    gpuModelPrimary: toNullableString(row.gpuModelPrimary),
    hardwareSerial: toNullableString(row.hardwareSerial),
    logicalCpuCount: toNullableNumber(row.logicalCpuCount),
    macAddress: toNullableString(row.macAddress),
    motherboardModel: toNullableString(row.motherboardModel),
    osProduct: toNullableString(row.osProduct),
    primaryIpv4: toNullableString(row.primaryIpv4),
    ssdModelPrimary: toNullableString(row.ssdModelPrimary),
    maxSeverityCode: toNumber(row.maxSeverityCode),
    hasOverrideFlag: toNumber(row.hasOverrideFlag),
    isAnyStale: toNumber(row.isAnyStale),
    staleMetricCount: toNumber(row.staleMetricCount),
    criticalMetricCount: toNumber(row.criticalMetricCount),
    warningMetricCount: toNumber(row.warningMetricCount),
    cpuUsagePctCurrent: toNullableNumber(row.cpuUsagePctCurrent),
    cpuUsagePctUnit: toNullableString(row.cpuUsagePctUnit),
    memoryUsagePctCurrent: toNullableNumber(row.memoryUsagePctCurrent),
    memoryUsagePctUnit: toNullableString(row.memoryUsagePctUnit),
    diskUsagePctCurrent: toNullableNumber(row.diskUsagePctCurrent),
    diskUsagePctUnit: toNullableString(row.diskUsagePctUnit),
    cpuTemperatureCCurrent: toNullableNumber(row.cpuTemperatureCCurrent),
    cpuTemperatureCUnit: toNullableString(row.cpuTemperatureCUnit),
    cpuPackagePowerWCurrent: toNullableNumber(row.cpuPackagePowerWCurrent),
    cpuPackagePowerWUnit: toNullableString(row.cpuPackagePowerWUnit),
    networkRxBytesSecCurrent: toNullableNumber(row.networkRxBytesSecCurrent),
    networkRxBytesSecUnit: toNullableString(row.networkRxBytesSecUnit),
    networkTxBytesSecCurrent: toNullableNumber(row.networkTxBytesSecCurrent),
    networkTxBytesSecUnit: toNullableString(row.networkTxBytesSecUnit),
    primaryNicStatusCurrent: toNullableString(row.primaryNicStatusCurrent),
    primaryNicStatusUnit: toNullableString(row.primaryNicStatusUnit),
    uptimeSecondsCurrent: toNullableNumber(row.uptimeSecondsCurrent),
    uptimeSecondsUnit: toNullableString(row.uptimeSecondsUnit),
    worstMetricKey: toNullableString(row.worstMetricKey),
    worstMetricValueNumeric: toNullableNumber(row.worstMetricValueNumeric),
    worstMetricValueText: toNullableString(row.worstMetricValueText),
  };
}

export function mapNodeOverviewWorkloadRow(
  row: NodeOverviewWorkloadRow,
): NodeOverviewWorkloadRecord {
  return {
    workloadId: row.workloadId,
    workloadType: row.workloadType,
    summaryTs: row.summaryTs,
    nodeId: row.nodeId,
    name: row.name,
    serviceName: row.serviceName,
    status: row.status,
    healthStatus: row.healthStatus,
    cpuUsagePct: toNullableNumber(row.cpuUsagePct),
    memoryUsagePct: toNullableNumber(row.memoryUsagePct),
    restartCount: toNumber(row.restartCount),
    pidCount: toNumber(row.pidCount),
    worstMetricKey: toNullableString(row.worstMetricKey),
    isAnyStale: toNumber(row.isAnyStale),
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return Number(value);
  }

  return 0;
}

function toNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return toNumber(value);
}

function toNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
