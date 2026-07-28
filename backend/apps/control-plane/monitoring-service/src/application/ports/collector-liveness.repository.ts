export interface CollectorHeartbeatRecord {
  nodeId: string;
  agentId: string | null;
  lastHeartbeatAt: string;
  source: string | null;
  metricKey: string | null;
  sourceMetric: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export abstract class CollectorLivenessRepository {
  abstract upsertHeartbeat(
    record: CollectorHeartbeatRecord,
  ): Promise<CollectorHeartbeatRecord>;

  abstract findByNodeId(nodeId: string): Promise<CollectorHeartbeatRecord | null>;
}
