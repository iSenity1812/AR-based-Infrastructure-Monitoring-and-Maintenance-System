export type NodeHealth = 'nominal' | 'warning' | 'critical';

export interface NodeContext {
  assetType: 'node' | 'rack';
  id: string;
  name: string;
  rack: string;
  status: NodeHealth;
  temperatureC: number | null;
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskPercent: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
  networkLatencyMs: number;
  activeTicketCount: number;
  lastTicketCode: string;
  updatedAt: string;
}

export interface NodeLiveMetrics {
  nodeId: string;
  observedAt: string;
  bucketSec: number;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  diskUsagePct: number | null;
  cpuTemperatureC: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
}
