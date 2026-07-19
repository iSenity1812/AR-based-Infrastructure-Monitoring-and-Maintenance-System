import { type ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';

import {
  RackOverviewCurrentRackRecord,
  RackOverviewCurrentRackSummary,
  RackOverviewHistoryRecord,
  RackOverviewReadRepository,
} from '../../../application/ports/rack-overview-read.repository';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';

type RackOverviewCurrentRackRow = {
  rackId: string;
  summaryTs: string;
  rackSeverityCode: number | string;
  hasOverrideFlag: number | string;
  totalNodes: number | string;
  badNodes: number | string;
  criticalNodes: number | string;
  warningNodes: number | string;
  staleNodes: number | string;
  silentDeadNodes: number | string;
  badNodeRatio: number | string;
  isRackLevelFailure: number | string;
  hasSignalLoss: number | string;
  worstNodeId: string;
  worstMetricKey: string;
  worstMetricTagsJson: string;
  worstMetricValueNumeric: number | string;
  worstMetricValueText: string;
  avgCpuUsagePct: number | string | null;
  avgMemoryUsedPct: number | string | null;
  maxDiskUsedPct: number | string | null;
  maxCpuTemperatureC: number | string | null;
  sumNetworkRxBytesSec: number | string | null;
  sumNetworkTxBytesSec: number | string | null;
};

type RackOverviewCurrentSummaryRow = {
  totalRacks: number | string;
  criticalRacks: number | string;
  warningRacks: number | string;
  staleRacks: number | string;
  signalLossRacks: number | string;
  rackLevelFailureRacks: number | string;
};

type RackOverviewHistoryRow = {
  bucketGranularity: '1m' | '5m';
  bucketStart: string;
  rackId: string;
  summaryTs: string;
  rackSeverityCode: number | string;
  hasOverrideFlag: number | string;
  totalNodes: number | string;
  badNodes: number | string;
  criticalNodes: number | string;
  warningNodes: number | string;
  badNodeRatio: number | string;
  isRackLevelFailure: number | string;
  worstNodeId: string;
  worstMetricKey: string;
  worstMetricTagsJson: string;
  worstMetricValueNumeric: number | string;
  worstMetricValueText: string;
};

@Injectable()
export class RackOverviewClickhouseRepository
  implements RackOverviewReadRepository
{
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async listCurrentRacks(): Promise<RackOverviewCurrentRackRecord[]> {
    return this.queryCurrentRacks();
  }

  async listCurrentRacksChangedSince(
    summaryTs: string,
  ): Promise<RackOverviewCurrentRackRecord[]> {
    return this.queryCurrentRacks(summaryTs);
  }

  async getCurrentRackSummary(): Promise<RackOverviewCurrentRackSummary> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          count() AS totalRacks,
          countIf(rack_severity_code = 3) AS criticalRacks,
          countIf(rack_severity_code = 2) AS warningRacks,
          countIf(stale_nodes > 0 OR has_signal_loss = 1) AS staleRacks,
          countIf(has_signal_loss = 1) AS signalLossRacks,
          countIf(is_rack_level_failure = 1) AS rackLevelFailureRacks
        FROM telemetry_db.rack_current_summary
        WHERE rack_id IS NOT NULL
          AND rack_id != ''
          AND rack_id != 'null'
      `,
      format: 'JSONEachRow',
    });

    const rows = await result.json<RackOverviewCurrentSummaryRow>();
    const summary = rows[0];

    return {
      totalRacks: toNumber(summary?.totalRacks),
      criticalRacks: toNumber(summary?.criticalRacks),
      warningRacks: toNumber(summary?.warningRacks),
      staleRacks: toNumber(summary?.staleRacks),
      signalLossRacks: toNumber(summary?.signalLossRacks),
      rackLevelFailureRacks: toNumber(summary?.rackLevelFailureRacks),
    };
  }

  async listRecentRackHistory(): Promise<RackOverviewHistoryRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          bucket_granularity AS bucketGranularity,
          toString(bucket_start) AS bucketStart,
          rack_id AS rackId,
          toString(summary_ts) AS summaryTs,
          rack_severity_code AS rackSeverityCode,
          has_override_flag AS hasOverrideFlag,
          total_nodes AS totalNodes,
          bad_nodes AS badNodes,
          critical_nodes AS criticalNodes,
          warning_nodes AS warningNodes,
          bad_node_ratio AS badNodeRatio,
          is_rack_level_failure AS isRackLevelFailure,
          worst_node_id AS worstNodeId,
          worst_metric_key AS worstMetricKey,
          worst_metric_tags_json AS worstMetricTagsJson,
          worst_metric_value_numeric AS worstMetricValueNumeric,
          worst_metric_value_text AS worstMetricValueText
        FROM telemetry_db.v_rack_summary_history
        WHERE bucket_granularity IN ('1m', '5m')
          AND bucket_start >= now() - INTERVAL 24 HOUR
          AND rack_id IS NOT NULL
          AND rack_id != ''
          AND rack_id != 'null'
        ORDER BY
          bucket_granularity ASC,
          bucket_start DESC,
          rack_id ASC
      `,
      format: 'JSONEachRow',
    });

    const rows = await result.json<RackOverviewHistoryRow>();
    return rows
      .map(mapRackOverviewHistoryRow)
      .filter((row) => isUsableRackId(row.rackId));
  }

  private async queryCurrentRacks(
    changedSinceSummaryTs?: string,
  ): Promise<RackOverviewCurrentRackRecord[]> {
    const incrementalFilter = changedSinceSummaryTs
      ? `
          AND summary_ts > parseDateTimeBestEffort({changedSinceSummaryTs: String})
        `
      : '';

    const sortClause = changedSinceSummaryTs
      ? `
          summary_ts ASC,
          rack_id ASC
        `
      : `
          rack_severity_code DESC,
          is_rack_level_failure DESC,
          has_signal_loss DESC,
          bad_node_ratio DESC,
          stale_nodes DESC,
          summary_ts DESC,
          rack_id ASC
        `;

    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          rack_id AS rackId,
          toString(summary_ts) AS summaryTs,
          rack_severity_code AS rackSeverityCode,
          has_override_flag AS hasOverrideFlag,
          total_nodes AS totalNodes,
          bad_nodes AS badNodes,
          critical_nodes AS criticalNodes,
          warning_nodes AS warningNodes,
          stale_nodes AS staleNodes,
          silent_dead_nodes AS silentDeadNodes,
          bad_node_ratio AS badNodeRatio,
          is_rack_level_failure AS isRackLevelFailure,
          has_signal_loss AS hasSignalLoss,
          worst_node_id AS worstNodeId,
          worst_metric_key AS worstMetricKey,
          worst_metric_tags_json AS worstMetricTagsJson,
          worst_metric_value_numeric AS worstMetricValueNumeric,
          worst_metric_value_text AS worstMetricValueText,
          avg_cpu_usage_pct AS avgCpuUsagePct,
          avg_memory_used_pct AS avgMemoryUsedPct,
          max_disk_used_pct AS maxDiskUsedPct,
          max_cpu_temperature_c AS maxCpuTemperatureC,
          sum_network_rx_bytes_sec AS sumNetworkRxBytesSec,
          sum_network_tx_bytes_sec AS sumNetworkTxBytesSec
        FROM telemetry_db.rack_current_summary
        WHERE rack_id IS NOT NULL
          AND rack_id != ''
          AND rack_id != 'null'
          ${incrementalFilter}
        ORDER BY ${sortClause}
      `,
      query_params: changedSinceSummaryTs
        ? { changedSinceSummaryTs }
        : undefined,
      format: 'JSONEachRow',
    });

    const rows = await result.json<RackOverviewCurrentRackRow>();
    return rows
      .map(mapRackOverviewCurrentRackRow)
      .filter((row) => isUsableRackId(row.rackId));
  }
}

export function mapRackOverviewCurrentRackRow(
  row: RackOverviewCurrentRackRow,
): RackOverviewCurrentRackRecord {
  return {
    rackId: row.rackId,
    summaryTs: row.summaryTs,
    rackSeverityCode: toNumber(row.rackSeverityCode),
    hasOverrideFlag: toNumber(row.hasOverrideFlag),
    totalNodes: toNumber(row.totalNodes),
    badNodes: toNumber(row.badNodes),
    criticalNodes: toNumber(row.criticalNodes),
    warningNodes: toNumber(row.warningNodes),
    staleNodes: toNumber(row.staleNodes),
    silentDeadNodes: toNumber(row.silentDeadNodes),
    badNodeRatio: toNumber(row.badNodeRatio),
    isRackLevelFailure: toNumber(row.isRackLevelFailure),
    hasSignalLoss: toNumber(row.hasSignalLoss),
    worstNodeId: row.worstNodeId,
    worstMetricKey: row.worstMetricKey,
    worstMetricTagsJson: row.worstMetricTagsJson,
    worstMetricValueNumeric: toNumber(row.worstMetricValueNumeric),
    worstMetricValueText: row.worstMetricValueText,
    avgCpuUsagePct: toNullableNumber(row.avgCpuUsagePct),
    avgMemoryUsedPct: toNullableNumber(row.avgMemoryUsedPct),
    maxDiskUsedPct: toNullableNumber(row.maxDiskUsedPct),
    maxCpuTemperatureC: toNullableNumber(row.maxCpuTemperatureC),
    sumNetworkRxBytesSec: toNullableNumber(row.sumNetworkRxBytesSec),
    sumNetworkTxBytesSec: toNullableNumber(row.sumNetworkTxBytesSec),
  };
}

export function mapRackOverviewHistoryRow(
  row: RackOverviewHistoryRow,
): RackOverviewHistoryRecord {
  return {
    bucketGranularity: row.bucketGranularity,
    bucketStart: row.bucketStart,
    rackId: row.rackId,
    summaryTs: row.summaryTs,
    rackSeverityCode: toNumber(row.rackSeverityCode),
    hasOverrideFlag: toNumber(row.hasOverrideFlag),
    totalNodes: toNumber(row.totalNodes),
    badNodes: toNumber(row.badNodes),
    criticalNodes: toNumber(row.criticalNodes),
    warningNodes: toNumber(row.warningNodes),
    badNodeRatio: toNumber(row.badNodeRatio),
    isRackLevelFailure: toNumber(row.isRackLevelFailure),
    worstNodeId: row.worstNodeId,
    worstMetricKey: row.worstMetricKey,
    worstMetricTagsJson: row.worstMetricTagsJson,
    worstMetricValueNumeric: toNumber(row.worstMetricValueNumeric),
    worstMetricValueText: row.worstMetricValueText,
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

function isUsableRackId(rackId: string | null | undefined): rackId is string {
  if (typeof rackId !== 'string') {
    return false;
  }

  const normalized = rackId.trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined';
}
