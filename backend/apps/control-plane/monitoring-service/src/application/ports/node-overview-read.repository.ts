export interface NodeOverviewSnapshotRecord {
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
  networkRxBytesSecCurrent: number | null;
  networkTxBytesSecCurrent: number | null;
  primaryNicStatusCurrent: string | null;
  worstMetricKey: string | null;
  worstMetricValueNumeric: number | null;
  worstMetricValueText: string | null;
}

export interface NodeOverviewWorkloadRecord {
  workloadId: string;
  workloadType: 'container';
  summaryTs: string;
  nodeId: string;
  name: string;
  serviceName: string;
  status: string;
  healthStatus: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  restartCount: number;
  pidCount: number;
  worstMetricKey: string | null;
  isAnyStale: number;
}

export abstract class NodeOverviewReadRepository {
  abstract getCurrentNode(
    nodeId: string,
  ): Promise<NodeOverviewSnapshotRecord | null>;

  abstract listNodeWorkloads(
    nodeId: string,
  ): Promise<NodeOverviewWorkloadRecord[]>;

  abstract getLatestNodeChangeSummaryTs(): Promise<string | null>;

  abstract listChangedNodeIdsSince(summaryTs: string): Promise<string[]>;
}
