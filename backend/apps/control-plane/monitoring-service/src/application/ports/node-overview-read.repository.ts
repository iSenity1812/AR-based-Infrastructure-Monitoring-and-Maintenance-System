export interface NodeOverviewSnapshotRecord {
  nodeId: string;
  summaryTs: string;
  fingerprintSeenAt: string | null;
  batteryModel: string | null;
  cpuArchitecture: string | null;
  cpuModel: string | null;
  gpuModelPrimary: string | null;
  hardwareSerial: string | null;
  logicalCpuCount: number | null;
  macAddress: string | null;
  motherboardModel: string | null;
  osProduct: string | null;
  primaryIpv4: string | null;
  ssdModelPrimary: string | null;
  maxSeverityCode: number;
  hasOverrideFlag: number;
  isAnyStale: number;
  staleMetricCount: number;
  criticalMetricCount: number;
  warningMetricCount: number;
  cpuUsagePctCurrent: number | null;
  cpuUsagePctUnit: string | null;
  memoryUsagePctCurrent: number | null;
  memoryUsagePctUnit: string | null;
  diskUsagePctCurrent: number | null;
  diskUsagePctUnit: string | null;
  cpuTemperatureCCurrent: number | null;
  cpuTemperatureCUnit: string | null;
  cpuPackagePowerWCurrent: number | null;
  cpuPackagePowerWUnit: string | null;
  networkRxBytesSecCurrent: number | null;
  networkRxBytesSecUnit: string | null;
  networkTxBytesSecCurrent: number | null;
  networkTxBytesSecUnit: string | null;
  primaryNicStatusCurrent: string | null;
  primaryNicStatusUnit: string | null;
  uptimeSecondsCurrent: number | null;
  uptimeSecondsUnit: string | null;
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

  abstract listNodeIdsForOverviewSync(): Promise<string[]>;
}
