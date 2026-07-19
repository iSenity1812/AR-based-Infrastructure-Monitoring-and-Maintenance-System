export type NodeMetricsSelectionMode =
  | 'top_cpu_then_memory'
  | 'top_memory_then_cpu'
  | 'abnormal_first_then_top_cpu'
  | 'abnormal_only'
  | 'pinned_workloads'
  | 'manual_ids';

export interface NodeMetricsCurrentRecord {
  nodeId: string;
  summaryTs: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  diskUsagePct: number | null;
  cpuTemperatureC: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
}

export interface NodeMetricsWorkloadRecord {
  workloadId: string;
  workloadType: 'container';
  summaryTs: string;
  nodeId: string;
  name: string;
  status: string;
  healthStatus: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  restartCount: number;
}

export interface NodeMetricsNodeBucketRecord {
  ts: string;
  nodeId: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  diskUsagePct: number | null;
  cpuTemperatureC: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
}

export interface NodeMetricsWorkloadBucketRecord {
  ts: string;
  workloadId: string;
  nodeId: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
}

export interface NodeMetricsSeedWindowQuery {
  fromTs: string;
  toTs: string;
  resolutionSec: number;
}

export interface NodeMetricsRangeInput {
  from?: string;
  to?: string;
}

export abstract class NodeMetricsReadRepository {
  abstract getCurrentNode(
    nodeId: string,
  ): Promise<NodeMetricsCurrentRecord | null>;

  abstract listNodeWorkloads(
    nodeId: string,
  ): Promise<NodeMetricsWorkloadRecord[]>;

  abstract listNodeSeedBuckets(
    nodeId: string,
    window: NodeMetricsSeedWindowQuery,
  ): Promise<NodeMetricsNodeBucketRecord[]>;

  abstract listWorkloadSeedBuckets(
    nodeId: string,
    workloadIds: string[],
    window: NodeMetricsSeedWindowQuery,
  ): Promise<NodeMetricsWorkloadBucketRecord[]>;

  abstract getLatestMetricsChangeSummaryTs(): Promise<string | null>;

  abstract listChangedNodeIdsSince(summaryTs: string): Promise<string[]>;

  abstract listNodeIdsForMetricsSync(): Promise<string[]>;
}
