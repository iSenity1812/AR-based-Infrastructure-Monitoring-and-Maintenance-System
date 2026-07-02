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

export abstract class RackOverviewReadRepository {
  abstract listCurrentRacks(): Promise<RackOverviewCurrentRackRecord[]>;

  abstract getCurrentRackSummary(): Promise<RackOverviewCurrentRackSummary>;

  abstract listRecentRackHistory(): Promise<RackOverviewHistoryRecord[]>;
}
