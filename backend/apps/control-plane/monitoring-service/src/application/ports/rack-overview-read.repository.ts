export interface RackOverviewCurrentRackRecord {
  rackId: string;
  summaryTs: string;
  rackSeverityCode: number;
  hasOverrideFlag: number;
  totalNodes: number;
  badNodes: number;
  criticalNodes: number;
  warningNodes: number;
  staleNodes: number;
  silentDeadNodes: number;
  badNodeRatio: number;
  isRackLevelFailure: number;
  hasSignalLoss: number;
  worstNodeId: string;
  worstMetricKey: string;
  worstMetricTagsJson: string;
  worstMetricValueNumeric: number;
  worstMetricValueText: string;
  avgCpuUsagePct: number | null;
  avgMemoryUsedPct: number | null;
  maxDiskUsedPct: number | null;
  maxCpuTemperatureC: number | null;
  sumNetworkRxBytesSec: number | null;
  sumNetworkTxBytesSec: number | null;
}

export interface RackOverviewCurrentRackSummary {
  totalRacks: number;
  criticalRacks: number;
  warningRacks: number;
  staleRacks: number;
  signalLossRacks: number;
  rackLevelFailureRacks: number;
}

export interface RackOverviewHistoryRecord {
  bucketGranularity: '1m' | '5m';
  bucketStart: string;
  rackId: string;
  summaryTs: string;
  rackSeverityCode: number;
  hasOverrideFlag: number;
  totalNodes: number;
  badNodes: number;
  criticalNodes: number;
  warningNodes: number;
  badNodeRatio: number;
  isRackLevelFailure: number;
  worstNodeId: string;
  worstMetricKey: string;
  worstMetricTagsJson: string;
  worstMetricValueNumeric: number;
  worstMetricValueText: string;
}

export interface RackOverviewNodeSnapshotRecord {
  nodeId: string;
  summaryTs: string;
  maxSeverityCode: number;
  hasOverrideFlag: number;
  isAnyStale: number;
  staleMetricCount: number;
  criticalMetricCount: number;
  warningMetricCount: number;
  cpuUsagePctCurrent: number | null;
  memoryUsagePctCurrent: number | null;
  diskUsagePctCurrent: number | null;
  cpuTemperatureCCurrent: number | null;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | null;
  worstMetricValueText: string | null;
}

export abstract class RackOverviewReadRepository {
  abstract listCurrentRacks(): Promise<RackOverviewCurrentRackRecord[]>;

  abstract listCurrentRacksChangedSince(
    summaryTs: string,
  ): Promise<RackOverviewCurrentRackRecord[]>;

  abstract getCurrentRackSummary(): Promise<RackOverviewCurrentRackSummary>;

  abstract listRecentRackHistory(): Promise<RackOverviewHistoryRecord[]>;

  abstract getCurrentRack(
    rackId: string,
  ): Promise<RackOverviewCurrentRackRecord | null>;

  abstract listRecentRackHistoryByRackId(
    rackId: string,
  ): Promise<RackOverviewHistoryRecord[]>;

  abstract listNodeSnapshotsByNodeIds(
    nodeIds: string[],
  ): Promise<RackOverviewNodeSnapshotRecord[]>;
}
