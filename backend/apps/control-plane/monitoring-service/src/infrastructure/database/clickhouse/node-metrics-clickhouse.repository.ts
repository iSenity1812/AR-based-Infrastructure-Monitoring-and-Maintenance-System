import { type ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';

import {
  NodeMetricsReadRepository,
  type NodeMetricsCurrentRecord,
  type NodeMetricsNodeBucketRecord,
  type NodeMetricsSeedWindowQuery,
  type NodeMetricsWorkloadBucketRecord,
  type NodeMetricsWorkloadRecord,
} from '../../../application/ports/node-metrics-read.repository';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';

type NodeMetricsCurrentRow = {
  nodeId: string;
  summaryTs: string;
  cpuUsagePct: number | string | null;
  memoryUsagePct: number | string | null;
  diskUsagePct: number | string | null;
  cpuTemperatureC: number | string | null;
  networkRxBytesSec: number | string | null;
  networkTxBytesSec: number | string | null;
};

type NodeMetricsWorkloadRow = {
  workloadId: string;
  workloadType: 'container';
  summaryTs: string;
  nodeId: string;
  name: string;
  status: string;
  healthStatus: string;
  cpuUsagePct: number | string | null;
  memoryUsagePct: number | string | null;
  restartCount: number | string;
};

type NodeMetricsNodeBucketRow = {
  ts: string;
  nodeId: string;
  cpuUsagePct: number | string | null;
  memoryUsagePct: number | string | null;
  diskUsagePct: number | string | null;
  cpuTemperatureC: number | string | null;
  networkRxBytesSec: number | string | null;
  networkTxBytesSec: number | string | null;
};

type NodeMetricsWorkloadBucketRow = {
  ts: string;
  workloadId: string;
  nodeId: string;
  cpuUsagePct: number | string | null;
  memoryUsagePct: number | string | null;
};

type LatestSummaryTsRow = {
  latestSummaryTs: string | null;
};

type ChangedNodeIdRow = {
  nodeId: string;
};

@Injectable()
export class NodeMetricsClickhouseRepository
  implements NodeMetricsReadRepository
{
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async getCurrentNode(
    nodeId: string,
  ): Promise<NodeMetricsCurrentRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          node_id AS nodeId,
          toString(summary_ts) AS summaryTs,
          cpu_usage_pct_current AS cpuUsagePct,
          memory_used_pct_current AS memoryUsagePct,
          disk_used_pct_max_current AS diskUsagePct,
          cpu_temperature_c_max_current AS cpuTemperatureC,
          network_rx_bytes_sec_sum_current AS networkRxBytesSec,
          network_tx_bytes_sec_sum_current AS networkTxBytesSec
        FROM telemetry_db.node_current_summary
        WHERE node_id = {nodeId: String}
        LIMIT 1
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeMetricsCurrentRow>();
    return rows[0] ? mapNodeMetricsCurrentRow(rows[0]) : null;
  }

  async listNodeWorkloads(
    nodeId: string,
  ): Promise<NodeMetricsWorkloadRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          container_id AS workloadId,
          'container' AS workloadType,
          toString(summary_ts) AS summaryTs,
          node_id AS nodeId,
          container_name AS name,
          container_state AS status,
          container_health_status AS healthStatus,
          cpu_usage_pct_current AS cpuUsagePct,
          memory_used_pct_current AS memoryUsagePct,
          restart_count_current AS restartCount
        FROM telemetry_db.container_current_summary
        WHERE node_id = {nodeId: String}
          AND container_id IS NOT NULL
          AND container_id != ''
        ORDER BY
          cpu_usage_pct_current DESC,
          memory_used_pct_current DESC,
          container_id ASC
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeMetricsWorkloadRow>();
    return rows.map(mapNodeMetricsWorkloadRow);
  }

  async listNodeSeedBuckets(
    nodeId: string,
    window: NodeMetricsSeedWindowQuery,
  ): Promise<NodeMetricsNodeBucketRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        WITH
          parseDateTimeBestEffort({fromTs: String}, 'UTC') AS fromTsUtc,
          parseDateTimeBestEffort({toTs: String}, 'UTC') AS toTsUtc,
          toIntervalSecond({resolutionSec: UInt32}) AS resolutionInterval
        SELECT
          formatDateTime(
            toStartOfInterval(
              toTimeZone(bucket_start, 'UTC'),
              resolutionInterval
            ),
            '%F %T',
            'UTC'
          ) AS ts,
          node_id AS nodeId,
          avg(cpu_usage_pct_current) AS cpuUsagePct,
          avg(memory_used_pct_current) AS memoryUsagePct,
          avg(disk_used_pct_max_current) AS diskUsagePct,
          avg(cpu_temperature_c_current) AS cpuTemperatureC,
          avg(network_rx_bytes_sec_sum_current) AS networkRxBytesSec,
          avg(network_tx_bytes_sec_sum_current) AS networkTxBytesSec
        FROM telemetry_db.node_summary_trend_1m
        WHERE node_id = {nodeId: String}
          AND toTimeZone(bucket_start, 'UTC') >= fromTsUtc
          AND toTimeZone(bucket_start, 'UTC') <= toTsUtc
        GROUP BY ts, nodeId
        ORDER BY ts ASC
      `,
      query_params: {
        nodeId,
        fromTs: window.fromTs,
        toTs: window.toTs,
        resolutionSec: window.resolutionSec,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeMetricsNodeBucketRow>();
    return rows.map(mapNodeMetricsNodeBucketRow);
  }

  async listWorkloadSeedBuckets(
    nodeId: string,
    workloadIds: string[],
    window: NodeMetricsSeedWindowQuery,
  ): Promise<NodeMetricsWorkloadBucketRecord[]> {
    if (workloadIds.length === 0) {
      return [];
    }

    const result = await this.clickhouseClient.query({
      query: `
        WITH
          parseDateTimeBestEffort({fromTs: String}, 'UTC') AS fromTsUtc,
          parseDateTimeBestEffort({toTs: String}, 'UTC') AS toTsUtc,
          toIntervalSecond({resolutionSec: UInt32}) AS resolutionInterval
        SELECT
          formatDateTime(
            toStartOfInterval(
              toTimeZone(bucket_start, 'UTC'),
              resolutionInterval
            ),
            '%F %T',
            'UTC'
          ) AS ts,
          container_id AS workloadId,
          node_id AS nodeId,
          avg(cpu_usage_pct_current) AS cpuUsagePct,
          avg(memory_used_pct_current) AS memoryUsagePct
        FROM telemetry_db.container_summary_trend_1m
        WHERE node_id = {nodeId: String}
          AND container_id IN {workloadIds: Array(String)}
          AND toTimeZone(bucket_start, 'UTC') >= fromTsUtc
          AND toTimeZone(bucket_start, 'UTC') <= toTsUtc
        GROUP BY ts, workloadId, nodeId
        ORDER BY ts ASC, workloadId ASC
      `,
      query_params: {
        nodeId,
        workloadIds,
        fromTs: window.fromTs,
        toTs: window.toTs,
        resolutionSec: window.resolutionSec,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeMetricsWorkloadBucketRow>();
    return rows.map(mapNodeMetricsWorkloadBucketRow);
  }

  async getLatestMetricsChangeSummaryTs(): Promise<string | null> {
    const result = await this.clickhouseClient.query({
      query: `
        WITH
          ifNull(
            (SELECT max(summary_ts) FROM telemetry_db.node_current_summary),
            toDateTime(0)
          ) AS nodeCurrentMaxSummaryTs,
          ifNull(
            (SELECT max(summary_ts) FROM telemetry_db.container_current_summary),
            toDateTime(0)
          ) AS workloadCurrentMaxSummaryTs,
          ifNull(
            (SELECT max(summary_ts) FROM telemetry_db.node_summary_trend_1m),
            toDateTime(0)
          ) AS nodeTrendMaxSummaryTs,
          ifNull(
            (SELECT max(summary_ts) FROM telemetry_db.container_summary_trend_1m),
            toDateTime(0)
          ) AS workloadTrendMaxSummaryTs
        SELECT
          toString(greatest(
            nodeCurrentMaxSummaryTs,
            workloadCurrentMaxSummaryTs,
            nodeTrendMaxSummaryTs,
            workloadTrendMaxSummaryTs
          )) AS latestSummaryTs
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
          FROM telemetry_db.node_summary_trend_1m
          WHERE toTimeZone(summary_ts, 'UTC') > changedSinceSummaryTsUtc

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.container_summary_trend_1m
          WHERE toTimeZone(summary_ts, 'UTC') > changedSinceSummaryTsUtc
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

  async listNodeIdsForMetricsSync(): Promise<string[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT DISTINCT nodeId
        FROM (
          SELECT node_id AS nodeId
          FROM telemetry_db.node_current_summary

          UNION DISTINCT

          SELECT node_id AS nodeId
          FROM telemetry_db.container_current_summary
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

export function mapNodeMetricsCurrentRow(
  row: NodeMetricsCurrentRow,
): NodeMetricsCurrentRecord {
  return {
    nodeId: row.nodeId,
    summaryTs: row.summaryTs,
    cpuUsagePct: toNullableNumber(row.cpuUsagePct),
    memoryUsagePct: toNullableNumber(row.memoryUsagePct),
    diskUsagePct: toNullableNumber(row.diskUsagePct),
    cpuTemperatureC: toNullableNumber(row.cpuTemperatureC),
    networkRxBytesSec: toNullableNumber(row.networkRxBytesSec),
    networkTxBytesSec: toNullableNumber(row.networkTxBytesSec),
  };
}

export function mapNodeMetricsWorkloadRow(
  row: NodeMetricsWorkloadRow,
): NodeMetricsWorkloadRecord {
  return {
    workloadId: row.workloadId,
    workloadType: row.workloadType,
    summaryTs: row.summaryTs,
    nodeId: row.nodeId,
    name: row.name,
    status: row.status,
    healthStatus: row.healthStatus,
    cpuUsagePct: toNullableNumber(row.cpuUsagePct),
    memoryUsagePct: toNullableNumber(row.memoryUsagePct),
    restartCount: toNumber(row.restartCount),
  };
}

export function mapNodeMetricsNodeBucketRow(
  row: NodeMetricsNodeBucketRow,
): NodeMetricsNodeBucketRecord {
  return {
    ts: row.ts,
    nodeId: row.nodeId,
    cpuUsagePct: toNullableNumber(row.cpuUsagePct),
    memoryUsagePct: toNullableNumber(row.memoryUsagePct),
    diskUsagePct: toNullableNumber(row.diskUsagePct),
    cpuTemperatureC: toNullableNumber(row.cpuTemperatureC),
    networkRxBytesSec: toNullableNumber(row.networkRxBytesSec),
    networkTxBytesSec: toNullableNumber(row.networkTxBytesSec),
  };
}

export function mapNodeMetricsWorkloadBucketRow(
  row: NodeMetricsWorkloadBucketRow,
): NodeMetricsWorkloadBucketRecord {
  return {
    ts: row.ts,
    workloadId: row.workloadId,
    nodeId: row.nodeId,
    cpuUsagePct: toNullableNumber(row.cpuUsagePct),
    memoryUsagePct: toNullableNumber(row.memoryUsagePct),
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
