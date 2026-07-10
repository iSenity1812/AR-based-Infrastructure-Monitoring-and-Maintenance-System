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
  maxSeverityCode: number | string;
  hasOverrideFlag: number | string;
  isAnyStale: number | string;
  staleMetricCount: number | string;
  criticalMetricCount: number | string;
  warningMetricCount: number | string;
  cpuUsagePctCurrent: number | string | null;
  memoryUsagePctCurrent: number | string | null;
  diskUsagePctCurrent: number | string | null;
  cpuTemperatureCCurrent: number | string | null;
  networkRxBytesSecCurrent: number | string | null;
  networkTxBytesSecCurrent: number | string | null;
  primaryNicStatusCurrent: string | null;
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
export class NodeOverviewClickhouseRepository
  implements NodeOverviewReadRepository
{
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
          node_id AS nodeId,
          toString(summary_ts) AS summaryTs,
          max_severity_code AS maxSeverityCode,
          has_override_flag AS hasOverrideFlag,
          is_any_stale AS isAnyStale,
          stale_metric_count AS staleMetricCount,
          critical_metric_count AS criticalMetricCount,
          warning_metric_count AS warningMetricCount,
          cpu_usage_pct_current AS cpuUsagePctCurrent,
          memory_used_pct_current AS memoryUsagePctCurrent,
          disk_used_pct_max_current AS diskUsagePctCurrent,
          cpu_temperature_c_current AS cpuTemperatureCCurrent,
          network_rx_bytes_sec_sum_current AS networkRxBytesSecCurrent,
          network_tx_bytes_sec_sum_current AS networkTxBytesSecCurrent,
          primary_nic_status_current AS primaryNicStatusCurrent,
          worst_metric_key AS worstMetricKey,
          worst_metric_numeric_value AS worstMetricValueNumeric,
          worst_metric_text_value AS worstMetricValueText
        FROM telemetry_db.node_current_summary
        WHERE node_id = {nodeId: String}
        LIMIT 1
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeOverviewSnapshotRow>();
    return rows[0] ? mapNodeOverviewSnapshotRow(rows[0]) : null;
  }

  async listNodeWorkloads(nodeId: string): Promise<NodeOverviewWorkloadRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          container_id AS workloadId,
          'container' AS workloadType,
          toString(summary_ts) AS summaryTs,
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
            (SELECT max(summary_ts) FROM telemetry_db.node_current_summary),
            toDateTime(0)
          ) AS nodeMaxSummaryTs,
          ifNull(
            (SELECT max(summary_ts) FROM telemetry_db.container_current_summary),
            toDateTime(0)
          ) AS workloadMaxSummaryTs
        SELECT toString(greatest(nodeMaxSummaryTs, workloadMaxSummaryTs)) AS latestSummaryTs
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
        SELECT DISTINCT nodeId
        FROM (
          SELECT node_id AS nodeId
          FROM telemetry_db.node_current_summary
          WHERE summary_ts > parseDateTimeBestEffort({changedSinceSummaryTs: String})

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.container_current_summary
          WHERE summary_ts > parseDateTimeBestEffort({changedSinceSummaryTs: String})
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
}

export function mapNodeOverviewSnapshotRow(
  row: NodeOverviewSnapshotRow,
): NodeOverviewSnapshotRecord {
  return {
    nodeId: row.nodeId,
    summaryTs: row.summaryTs,
    maxSeverityCode: toNumber(row.maxSeverityCode),
    hasOverrideFlag: toNumber(row.hasOverrideFlag),
    isAnyStale: toNumber(row.isAnyStale),
    staleMetricCount: toNumber(row.staleMetricCount),
    criticalMetricCount: toNumber(row.criticalMetricCount),
    warningMetricCount: toNumber(row.warningMetricCount),
    cpuUsagePctCurrent: toNullableNumber(row.cpuUsagePctCurrent),
    memoryUsagePctCurrent: toNullableNumber(row.memoryUsagePctCurrent),
    diskUsagePctCurrent: toNullableNumber(row.diskUsagePctCurrent),
    cpuTemperatureCCurrent: toNullableNumber(row.cpuTemperatureCCurrent),
    networkRxBytesSecCurrent: toNullableNumber(row.networkRxBytesSecCurrent),
    networkTxBytesSecCurrent: toNullableNumber(row.networkTxBytesSecCurrent),
    primaryNicStatusCurrent: toNullableString(row.primaryNicStatusCurrent),
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
