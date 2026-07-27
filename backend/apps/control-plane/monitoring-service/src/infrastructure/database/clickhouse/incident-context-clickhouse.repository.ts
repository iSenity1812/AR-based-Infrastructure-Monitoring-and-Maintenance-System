import { type ClickHouseClient } from '@clickhouse/client';
import { Inject, Injectable } from '@nestjs/common';

import { IncidentContextReadRepository } from '../../../application/ports/incident-context-read.repository';
import type {
  IncidentContextRackCurrentRecord,
  IncidentContextRackHistoryRecord,
  IncidentContextMetricEvidenceRecord,
  IncidentContextMetricPolicyRecord,
  IncidentContextNodeCurrentConditionRecord,
  IncidentContextNodeDataRecord,
  IncidentContextNodeHeartbeatRecord,
  IncidentContextNodeInvestigationRecord,
  IncidentContextNodeLivenessRecord,
  IncidentContextObservedHardwareRecord,
  IncidentContextRackInvestigationRecord,
  InvestigationMetricSeriesRecord,
} from '../../../application/services/incident-context-snapshot.contract';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';

type NodeCurrentSummaryRow = {
  summaryTs: string;
  healthCode: number | string;
  operationalSeverityCode: number | string;
  signalSeverityCode: number | string;
  isAnyStale: number | string;
  staleMetricCount: number | string;
  warningMetricCount: number | string;
  criticalMetricCount: number | string;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | string | null;
  worstMetricValueText: string | null;
};

type NodeHeartbeatRow = {
  metricKey: string;
  latestTs: string | null;
  staleAgeSec: number | string | null;
  freshnessCode: number | string | null;
  liveState: string | null;
  severityCode: number | string | null;
};

type NodeFingerprintRow = {
  observedAt: string;
  osProduct: string | null;
  primaryIpv4: string | null;
  macAddress: string | null;
  logicalCpuCount: number | string | null;
  cpuArchitecture: string | null;
  cpuModel: string | null;
  gpuModelPrimary: string | null;
  hardwareSerial: string | null;
  motherboardModel: string | null;
  ssdModelPrimary: string | null;
  batteryModel: string | null;
};

type MetricEvidenceRow = {
  metricKey: string;
  label: string | null;
  unit: string | null;
  windowMin: number | string | null;
  windowMax: number | string | null;
  windowAvg: number | string | null;
  lastValueNumeric: number | string | null;
  lastValueText: string | null;
};

type InvestigationMetricSeriesRow = {
  bucketStart: string;
  metricKey: string;
  label: string | null;
  unit: string | null;
  valueNumeric: number | string | null;
  valueText: string | null;
  severityCode: number | string | null;
};

type MetricProfileRow = {
  metricKey: string;
  policyVersion: number | string | null;
  staleAfterSec: number | string | null;
};

type RackCurrentSummaryRow = {
  summaryTs: string;
  rackSeverityCode: number | string;
  totalNodes: number | string;
  badNodes: number | string;
  criticalNodes: number | string;
  warningNodes: number | string;
  staleNodes: number | string;
  silentDeadNodes: number | string;
  badNodeRatio: number | string;
  isRackLevelFailure: number | string;
  hasSignalLoss: number | string;
  worstNodeId: string | null;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | string | null;
  worstMetricValueText: string | null;
};

type RackHistoryRow = {
  bucketStart: string;
  summaryTs: string;
  rackSeverityCode: number | string;
  totalNodes: number | string;
  badNodes: number | string;
  criticalNodes: number | string;
  warningNodes: number | string;
  badNodeRatio: number | string;
  isRackLevelFailure: number | string;
  worstNodeId: string | null;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | string | null;
  worstMetricValueText: string | null;
};

@Injectable()
export class IncidentContextClickhouseRepository
  implements IncidentContextReadRepository
{
  constructor(
    @Inject(CLICKHOUSE_CLIENT)
    private readonly clickhouseClient: ClickHouseClient,
  ) {}

  async getNodeContext(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<IncidentContextNodeDataRecord> {
    const [currentCondition, heartbeat, observedHardware, metricEvidence, heartbeatPolicy] =
      await Promise.all([
        this.queryCurrentCondition(input.nodeId),
        this.queryHeartbeat(input.nodeId),
        this.queryObservedHardware(input.nodeId),
        this.queryMetricEvidence(input),
        this.queryHeartbeatPolicy(),
      ]);

    return {
      currentCondition,
      heartbeat,
      observedHardware,
      metricEvidence,
      heartbeatPolicy,
    };
  }

  async getNodeInvestigation(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<IncidentContextNodeInvestigationRecord> {
    const [context, metricSeries] = await Promise.all([
      this.getNodeContext(input),
      this.queryNodeMetricSeries(input),
    ]);

    return {
      ...context,
      metricSeries,
    };
  }

  async getNodeLiveness(input: {
    nodeId: string;
  }): Promise<IncidentContextNodeLivenessRecord | null> {
    const [heartbeat, heartbeatPolicy] = await Promise.all([
      this.queryHeartbeat(input.nodeId),
      this.queryHeartbeatPolicy(),
    ]);

    if (!heartbeat && !heartbeatPolicy) {
      return null;
    }

    return {
      nodeId: input.nodeId,
      lastHeartbeatAt: heartbeat?.latestTs ?? null,
      staleAgeSec: heartbeat?.staleAgeSec ?? null,
      sourceLiveState: heartbeat?.liveState ?? null,
      staleAfterSec: heartbeatPolicy?.staleAfterSec ?? null,
      policyVersion: heartbeatPolicy?.policyVersion ?? null,
    };
  }

  async getRackInvestigation(input: {
    rackId: string;
    from: string;
    to: string;
    interval: '1m' | '5m';
  }): Promise<IncidentContextRackInvestigationRecord> {
    const [current, history] = await Promise.all([
      this.queryRackCurrent(input.rackId),
      this.queryRackHistory(input),
    ]);

    return {
      current,
      history,
    };
  }

  private async queryCurrentCondition(
    nodeId: string,
  ): Promise<IncidentContextNodeCurrentConditionRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          toString(toTimeZone(summary_ts, 'UTC')) AS summaryTs,
          overall_health_code AS healthCode,
          operational_severity_code AS operationalSeverityCode,
          signal_severity_code AS signalSeverityCode,
          is_any_stale AS isAnyStale,
          stale_metric_count AS staleMetricCount,
          warning_metric_count AS warningMetricCount,
          critical_metric_count AS criticalMetricCount,
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

    const rows = await result.json<NodeCurrentSummaryRow>();
    return rows[0] ? mapCurrentCondition(rows[0]) : null;
  }

  private async queryHeartbeat(
    nodeId: string,
  ): Promise<IncidentContextNodeHeartbeatRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          metric_key AS metricKey,
          toString(toTimeZone(latest_ts, 'UTC')) AS latestTs,
          stale_age_sec AS staleAgeSec,
          freshness_code AS freshnessCode,
          live_state AS liveState,
          severity_code AS severityCode
        FROM telemetry_db.node_current_live
        WHERE node_id = {nodeId: String}
          AND metric_key = 'agent.heartbeat'
        LIMIT 1
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeHeartbeatRow>();
    return rows[0] ? mapHeartbeat(rows[0]) : null;
  }

  private async queryObservedHardware(
    nodeId: string,
  ): Promise<IncidentContextObservedHardwareRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          toString(toTimeZone(latest_ts, 'UTC')) AS observedAt,
          os_product AS osProduct,
          primary_ipv4 AS primaryIpv4,
          mac_address AS macAddress,
          logical_cpu_count AS logicalCpuCount,
          cpu_architecture AS cpuArchitecture,
          cpu_model AS cpuModel,
          gpu_model_primary AS gpuModelPrimary,
          hardware_serial AS hardwareSerial,
          motherboard_model AS motherboardModel,
          ssd_model_primary AS ssdModelPrimary,
          battery_model AS batteryModel
        FROM telemetry_db.node_fingerprint_latest
        WHERE node_id = {nodeId: String}
        LIMIT 1
      `,
      query_params: { nodeId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<NodeFingerprintRow>();
    return rows[0] ? mapObservedHardware(rows[0]) : null;
  }

  private async queryMetricEvidence(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<IncidentContextMetricEvidenceRecord | null> {
    if (!input.metricKey?.trim()) {
      return null;
    }

    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          metric_key AS metricKey,
          CAST(NULL, 'Nullable(String)') AS unit,
          any(
            dictGetStringOrDefault(
              'dict_metric_profile',
              'metric_label',
              tuple('node', metric_key),
              ''
            )
          ) AS label,
          min(value_min) AS windowMin,
          max(value_max) AS windowMax,
          avg(value_avg) AS windowAvg,
          anyLast(value_last) AS lastValueNumeric,
          anyLast(text_last) AS lastValueText
        FROM telemetry_db.v_agg_1m_by_scope_metric
        WHERE scope_type = 'node'
          AND scope_id = {nodeId: String}
          AND metric_key = {metricKey: String}
          AND bucket_start >= parseDateTimeBestEffort({fromTs: String}, 'UTC')
          AND bucket_start <= parseDateTimeBestEffort({toTs: String}, 'UTC')
        GROUP BY metric_key
      `,
      query_params: {
        nodeId: input.nodeId,
        metricKey: input.metricKey,
        fromTs: input.from,
        toTs: input.to,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<MetricEvidenceRow>();
    return rows[0] ? mapMetricEvidence(rows[0]) : null;
  }

  private async queryHeartbeatPolicy(): Promise<IncidentContextMetricPolicyRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          metric_key AS metricKey,
          policy_version AS policyVersion,
          stale_after_sec AS staleAfterSec
        FROM telemetry_db.metric_profile
        WHERE metric_key = 'agent.heartbeat'
        LIMIT 1
      `,
      format: 'JSONEachRow',
    });

    const rows = await result.json<MetricProfileRow>();
    return rows[0] ? mapMetricPolicy(rows[0]) : null;
  }

  private async queryNodeMetricSeries(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }): Promise<InvestigationMetricSeriesRecord[]> {
    if (!input.metricKey?.trim()) {
      return [];
    }

    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          toString(toTimeZone(bucket_start, 'UTC')) AS bucketStart,
          metric_key AS metricKey,
          any(
            dictGetStringOrDefault(
              'dict_metric_profile',
              'metric_label',
              tuple('node', metric_key),
              ''
            )
          ) AS label,
          CAST(NULL, 'Nullable(String)') AS unit,
          anyLast(value_last) AS valueNumeric,
          anyLast(text_last) AS valueText,
          max(max_severity_code) AS severityCode
        FROM telemetry_db.v_agg_1m_by_scope_metric
        WHERE scope_type = 'node'
          AND scope_id = {nodeId: String}
          AND metric_key = {metricKey: String}
          AND bucket_start >= parseDateTimeBestEffort({fromTs: String}, 'UTC')
          AND bucket_start <= parseDateTimeBestEffort({toTs: String}, 'UTC')
        GROUP BY bucket_start, metric_key
        ORDER BY bucket_start ASC
      `,
      query_params: {
        nodeId: input.nodeId,
        metricKey: input.metricKey,
        fromTs: input.from,
        toTs: input.to,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<InvestigationMetricSeriesRow>();
    if (rows.length === 0) {
      return [];
    }

    return [
      {
        metricKey: rows[0].metricKey,
        label: toNullableString(rows[0].label),
        unit: toNullableString(rows[0].unit),
        points: rows.map((row) => ({
          timestamp: row.bucketStart,
          valueNumeric: toNullableNumber(row.valueNumeric),
          valueText: toNullableString(row.valueText),
          severityCode: toNullableNumber(row.severityCode),
        })),
      },
    ];
  }

  private async queryRackCurrent(
    rackId: string,
  ): Promise<IncidentContextRackCurrentRecord | null> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          toString(toTimeZone(summary_ts, 'UTC')) AS summaryTs,
          rack_severity_code AS rackSeverityCode,
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
          worst_metric_value_numeric AS worstMetricValueNumeric,
          worst_metric_value_text AS worstMetricValueText
        FROM telemetry_db.rack_current_summary
        WHERE rack_id = {rackId: String}
        LIMIT 1
      `,
      query_params: { rackId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<RackCurrentSummaryRow>();
    return rows[0] ? mapRackCurrent(rows[0]) : null;
  }

  private async queryRackHistory(input: {
    rackId: string;
    from: string;
    to: string;
    interval: '1m' | '5m';
  }): Promise<IncidentContextRackHistoryRecord[]> {
    const result = await this.clickhouseClient.query({
      query: `
        SELECT
          toString(toTimeZone(bucket_start, 'UTC')) AS bucketStart,
          toString(toTimeZone(summary_ts, 'UTC')) AS summaryTs,
          rack_severity_code AS rackSeverityCode,
          total_nodes AS totalNodes,
          bad_nodes AS badNodes,
          critical_nodes AS criticalNodes,
          warning_nodes AS warningNodes,
          bad_node_ratio AS badNodeRatio,
          is_rack_level_failure AS isRackLevelFailure,
          worst_node_id AS worstNodeId,
          worst_metric_key AS worstMetricKey,
          worst_metric_value_numeric AS worstMetricValueNumeric,
          worst_metric_value_text AS worstMetricValueText
        FROM telemetry_db.v_rack_summary_history
        WHERE rack_id = {rackId: String}
          AND bucket_granularity = {interval: String}
          AND bucket_start >= parseDateTimeBestEffort({fromTs: String}, 'UTC')
          AND bucket_start <= parseDateTimeBestEffort({toTs: String}, 'UTC')
        ORDER BY bucket_start ASC
      `,
      query_params: {
        rackId: input.rackId,
        interval: input.interval,
        fromTs: input.from,
        toTs: input.to,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<RackHistoryRow>();
    return rows.map(mapRackHistory);
  }
}

function mapCurrentCondition(
  row: NodeCurrentSummaryRow,
): IncidentContextNodeCurrentConditionRecord {
  return {
    summaryTs: row.summaryTs,
    healthCode: toNumber(row.healthCode),
    operationalSeverityCode: toNumber(row.operationalSeverityCode),
    signalSeverityCode: toNumber(row.signalSeverityCode),
    isAnyStale: toNumber(row.isAnyStale) > 0,
    staleMetricCount: toNumber(row.staleMetricCount),
    warningMetricCount: toNumber(row.warningMetricCount),
    criticalMetricCount: toNumber(row.criticalMetricCount),
    worstMetricKey: toNullableString(row.worstMetricKey),
    worstMetricValueNumeric: toNullableNumber(row.worstMetricValueNumeric),
    worstMetricValueText: toNullableString(row.worstMetricValueText),
  };
}

function mapHeartbeat(
  row: NodeHeartbeatRow,
): IncidentContextNodeHeartbeatRecord {
  return {
    metricKey: row.metricKey,
    latestTs: toNullableString(row.latestTs),
    staleAgeSec: toNullableNumber(row.staleAgeSec),
    freshnessCode: toNullableNumber(row.freshnessCode),
    liveState: toNullableString(row.liveState),
    severityCode: toNullableNumber(row.severityCode),
  };
}

function mapObservedHardware(
  row: NodeFingerprintRow,
): IncidentContextObservedHardwareRecord {
  return {
    observedAt: row.observedAt,
    osProduct: toNullableString(row.osProduct),
    primaryIpv4: toNullableString(row.primaryIpv4),
    macAddress: toNullableString(row.macAddress),
    logicalCpuCount: toNullableNumber(row.logicalCpuCount),
    cpuArchitecture: toNullableString(row.cpuArchitecture),
    cpuModel: toNullableString(row.cpuModel),
    gpuModelPrimary: toNullableString(row.gpuModelPrimary),
    hardwareSerial: toNullableString(row.hardwareSerial),
    motherboardModel: toNullableString(row.motherboardModel),
    ssdModelPrimary: toNullableString(row.ssdModelPrimary),
    batteryModel: toNullableString(row.batteryModel),
  };
}

function mapMetricEvidence(
  row: MetricEvidenceRow,
): IncidentContextMetricEvidenceRecord {
  return {
    metricKey: row.metricKey,
    unit: toNullableString(row.unit),
    label: toNullableString(row.label),
    windowMin: toNullableNumber(row.windowMin),
    windowMax: toNullableNumber(row.windowMax),
    windowAvg: toNullableNumber(row.windowAvg),
    lastValueNumeric: toNullableNumber(row.lastValueNumeric),
    lastValueText: toNullableString(row.lastValueText),
  };
}

function mapMetricPolicy(
  row: MetricProfileRow,
): IncidentContextMetricPolicyRecord {
  return {
    metricKey: row.metricKey,
    policyVersion: toNullableNumber(row.policyVersion),
    staleAfterSec: toNullableNumber(row.staleAfterSec),
  };
}

function mapRackCurrent(
  row: RackCurrentSummaryRow,
): IncidentContextRackCurrentRecord {
  return {
    summaryTs: row.summaryTs,
    rackSeverityCode: toNumber(row.rackSeverityCode),
    totalNodes: toNumber(row.totalNodes),
    badNodes: toNumber(row.badNodes),
    criticalNodes: toNumber(row.criticalNodes),
    warningNodes: toNumber(row.warningNodes),
    staleNodes: toNumber(row.staleNodes),
    silentDeadNodes: toNumber(row.silentDeadNodes),
    badNodeRatio: toNumber(row.badNodeRatio),
    isRackLevelFailure: toNumber(row.isRackLevelFailure) > 0,
    hasSignalLoss: toNumber(row.hasSignalLoss) > 0,
    worstNodeId: toNullableString(row.worstNodeId),
    worstMetricKey: toNullableString(row.worstMetricKey),
    worstMetricValueNumeric: toNullableNumber(row.worstMetricValueNumeric),
    worstMetricValueText: toNullableString(row.worstMetricValueText),
  };
}

function mapRackHistory(
  row: RackHistoryRow,
): IncidentContextRackHistoryRecord {
  return {
    bucketStart: row.bucketStart,
    summaryTs: row.summaryTs,
    rackSeverityCode: toNumber(row.rackSeverityCode),
    totalNodes: toNumber(row.totalNodes),
    badNodes: toNumber(row.badNodes),
    criticalNodes: toNumber(row.criticalNodes),
    warningNodes: toNumber(row.warningNodes),
    badNodeRatio: toNumber(row.badNodeRatio),
    isRackLevelFailure: toNumber(row.isRackLevelFailure) > 0,
    worstNodeId: toNullableString(row.worstNodeId),
    worstMetricKey: toNullableString(row.worstMetricKey),
    worstMetricValueNumeric: toNullableNumber(row.worstMetricValueNumeric),
    worstMetricValueText: toNullableString(row.worstMetricValueText),
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
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
