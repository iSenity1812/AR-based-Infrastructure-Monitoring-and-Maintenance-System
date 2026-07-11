import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  NodeMetricsReadRepository,
  type NodeMetricsNodeBucketRecord,
  type NodeMetricsSelectionMode,
  type NodeMetricsWorkloadBucketRecord,
  type NodeMetricsWorkloadRecord,
} from '../ports/node-metrics-read.repository';

export const NODE_METRICS_UPDATED_EVENT = 'monitoring.node.metrics.updated';
export const NODE_METRICS_WORKLOADS_CHANGED_EVENT =
  'monitoring.node.metrics.workloads.changed';

export const NODE_METRIC_KEYS = [
  'cpuUsagePct',
  'memoryUsagePct',
  'diskUsagePct',
  'cpuTemperatureC',
  'networkRxBytesSec',
  'networkTxBytesSec',
] as const;

export const WORKLOAD_METRIC_KEYS = ['cpuUsagePct', 'memoryUsagePct'] as const;

export type NodeMetricKey = (typeof NODE_METRIC_KEYS)[number];
export type WorkloadMetricKey = (typeof WORKLOAD_METRIC_KEYS)[number];

export type NodeMetricsResponseView = {
  node: {
    nodeId: string;
    lastSeenAt: string;
    freshnessSec: number;
  };
  metricsConfig: {
    transport: 'socket.io';
    channel: typeof NODE_METRICS_UPDATED_EVENT;
    bucketSec: 60;
    retentionSec: 900;
    nodeMetricKeys: NodeMetricKey[];
    workloadMetricKeys: WorkloadMetricKey[];
  };
  workloadSummary: {
    total: number;
    returned: number;
    selectionMode: NodeMetricsSelectionMode;
  };
  workloads: Array<{
    workloadId: string;
    workloadType: 'container';
    name: string;
    status: string;
    latestCpuUsagePct: number | null;
    latestMemoryUsagePct: number | null;
  }>;
  seedWindow: {
    from: string | null;
    to: string | null;
    points: NodeMetricsSeedPointView[];
  };
};

export type NodeMetricsSeedPointView = {
  ts: string;
  node: NodeMetricsNodeValuesView;
  workloads: NodeMetricsWorkloadValuesView[];
};

export type NodeMetricsUpdatedEventView = {
  event: typeof NODE_METRICS_UPDATED_EVENT;
  nodeId: string;
  ts: string;
  bucketSec: 60;
  node: NodeMetricsNodeValuesView;
  workloads: NodeMetricsWorkloadValuesView[];
};

export type NodeMetricsWorkloadsChangedEventView = {
  event: typeof NODE_METRICS_WORKLOADS_CHANGED_EVENT;
  nodeId: string;
  ts: string;
  workloadSummary: NodeMetricsResponseView['workloadSummary'];
  workloads: NodeMetricsResponseView['workloads'];
};

type NodeMetricsNodeValuesView = {
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  diskUsagePct: number | null;
  cpuTemperatureC: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
};

type NodeMetricsWorkloadValuesView = {
  workloadId: string;
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
};

const BUCKET_SEC = 60;
const RETENTION_SEC = 900;
const SEED_BUCKET_LIMIT = RETENTION_SEC / BUCKET_SEC;
const MAX_TRACKED_WORKLOADS = 5;
const DEFAULT_SELECTION_MODE: NodeMetricsSelectionMode = 'top_cpu_then_memory';

@Injectable()
export class NodeMetricsComposerService {
  constructor(
    @Inject(NodeMetricsReadRepository)
    private readonly nodeMetricsReadRepository: NodeMetricsReadRepository,
  ) {}

  async buildMetrics(nodeId: string): Promise<NodeMetricsResponseView> {
    const currentNode = await this.nodeMetricsReadRepository.getCurrentNode(
      nodeId,
    );
    if (!currentNode) {
      throw new NotFoundException(
        `Node metrics snapshot not found for nodeId=${nodeId}`,
      );
    }

    const workloads = await this.nodeMetricsReadRepository.listNodeWorkloads(
      nodeId,
    );
    const trackedWorkloads = selectNodeMetricsWorkloads(workloads);
    const trackedWorkloadIds = trackedWorkloads.map(
      (workload) => workload.workloadId,
    );
    const [nodeBuckets, workloadBuckets] = await Promise.all([
      this.nodeMetricsReadRepository.listNodeSeedBuckets(
        nodeId,
        SEED_BUCKET_LIMIT,
      ),
      this.nodeMetricsReadRepository.listWorkloadSeedBuckets(
        nodeId,
        trackedWorkloadIds,
        SEED_BUCKET_LIMIT,
      ),
    ]);

    return {
      node: {
        nodeId: currentNode.nodeId,
        lastSeenAt: toIsoString(currentNode.summaryTs),
        freshnessSec: computeFreshnessSec(currentNode.summaryTs),
      },
      metricsConfig: buildMetricsConfig(),
      workloadSummary: buildWorkloadSummary(workloads.length, trackedWorkloads),
      workloads: trackedWorkloads.map(mapWorkloadView),
      seedWindow: buildSeedWindow(nodeBuckets, workloadBuckets),
    };
  }

  async buildUpdatedEvent(
    nodeId: string,
  ): Promise<NodeMetricsUpdatedEventView | null> {
    const workloads = await this.nodeMetricsReadRepository.listNodeWorkloads(
      nodeId,
    );
    const trackedWorkloadIds = selectNodeMetricsWorkloads(workloads).map(
      (workload) => workload.workloadId,
    );
    const nodeBuckets = await this.nodeMetricsReadRepository.listNodeSeedBuckets(
      nodeId,
      1,
    );
    const latestNodeBucket = nodeBuckets[0];
    if (!latestNodeBucket) {
      return null;
    }

    const workloadBuckets =
      await this.nodeMetricsReadRepository.listWorkloadSeedBuckets(
        nodeId,
        trackedWorkloadIds,
        1,
      );

    return {
      event: NODE_METRICS_UPDATED_EVENT,
      nodeId,
      ts: toIsoString(latestNodeBucket.ts),
      bucketSec: BUCKET_SEC,
      node: mapNodeValues(latestNodeBucket),
      workloads: workloadBuckets
        .filter((bucket) => bucket.ts === latestNodeBucket.ts)
        .map(mapWorkloadValues),
    };
  }

  async buildWorkloadsChangedEvent(
    nodeId: string,
  ): Promise<NodeMetricsWorkloadsChangedEventView | null> {
    const workloads = await this.nodeMetricsReadRepository.listNodeWorkloads(
      nodeId,
    );
    const trackedWorkloads = selectNodeMetricsWorkloads(workloads);
    const latestTs = trackedWorkloads[0]?.summaryTs ?? new Date().toISOString();

    return {
      event: NODE_METRICS_WORKLOADS_CHANGED_EVENT,
      nodeId,
      ts: toIsoString(latestTs),
      workloadSummary: buildWorkloadSummary(workloads.length, trackedWorkloads),
      workloads: trackedWorkloads.map(mapWorkloadView),
    };
  }
}

export function buildMetricsConfig(): NodeMetricsResponseView['metricsConfig'] {
  return {
    transport: 'socket.io',
    channel: NODE_METRICS_UPDATED_EVENT,
    bucketSec: BUCKET_SEC,
    retentionSec: RETENTION_SEC,
    nodeMetricKeys: [...NODE_METRIC_KEYS],
    workloadMetricKeys: [...WORKLOAD_METRIC_KEYS],
  };
}

export function selectNodeMetricsWorkloads(
  workloads: NodeMetricsWorkloadRecord[],
  selectionMode: NodeMetricsSelectionMode = DEFAULT_SELECTION_MODE,
): NodeMetricsWorkloadRecord[] {
  const sorted = [...workloads].sort((left, right) => {
    if (selectionMode === 'top_memory_then_cpu') {
      const memoryDelta =
        (right.memoryUsagePct ?? -1) - (left.memoryUsagePct ?? -1);
      if (memoryDelta !== 0) {
        return memoryDelta;
      }

      const cpuDelta = (right.cpuUsagePct ?? -1) - (left.cpuUsagePct ?? -1);
      if (cpuDelta !== 0) {
        return cpuDelta;
      }

      return left.workloadId.localeCompare(right.workloadId);
    }

    if (
      selectionMode === 'abnormal_first_then_top_cpu' ||
      selectionMode === 'abnormal_only'
    ) {
      const abnormalDelta =
        Number(isMetricsAbnormalWorkload(right)) -
        Number(isMetricsAbnormalWorkload(left));
      if (abnormalDelta !== 0) {
        return abnormalDelta;
      }
    }

    const cpuDelta = (right.cpuUsagePct ?? -1) - (left.cpuUsagePct ?? -1);
    if (cpuDelta !== 0) {
      return cpuDelta;
    }

    const memoryDelta =
      (right.memoryUsagePct ?? -1) - (left.memoryUsagePct ?? -1);
    if (memoryDelta !== 0) {
      return memoryDelta;
    }

    return left.workloadId.localeCompare(right.workloadId);
  });

  const eligible =
    selectionMode === 'abnormal_only'
      ? sorted.filter(isMetricsAbnormalWorkload)
      : sorted;

  return eligible.slice(0, MAX_TRACKED_WORKLOADS);
}

export function buildTrackedWorkloadFingerprint(
  workloads: NodeMetricsResponseView['workloads'],
): string {
  return workloads.map((workload) => workload.workloadId).join('|');
}

function buildWorkloadSummary(
  total: number,
  trackedWorkloads: NodeMetricsWorkloadRecord[],
): NodeMetricsResponseView['workloadSummary'] {
  return {
    total,
    returned: trackedWorkloads.length,
    selectionMode: DEFAULT_SELECTION_MODE,
  };
}

function buildSeedWindow(
  nodeBuckets: NodeMetricsNodeBucketRecord[],
  workloadBuckets: NodeMetricsWorkloadBucketRecord[],
): NodeMetricsResponseView['seedWindow'] {
  const normalizedNodeBuckets = [...nodeBuckets].sort(
    (left, right) => parseTimestamp(left.ts) - parseTimestamp(right.ts),
  );
  const workloadBucketsByTs = new Map<string, NodeMetricsWorkloadBucketRecord[]>();

  for (const bucket of workloadBuckets) {
    const isoTs = toIsoString(bucket.ts);
    workloadBucketsByTs.set(isoTs, [
      ...(workloadBucketsByTs.get(isoTs) ?? []),
      bucket,
    ]);
  }

  const points = normalizedNodeBuckets.map((bucket) => {
    const ts = toIsoString(bucket.ts);
    return {
      ts,
      node: mapNodeValues(bucket),
      workloads: (workloadBucketsByTs.get(ts) ?? []).map(mapWorkloadValues),
    };
  });

  return {
    from: points[0]?.ts ?? null,
    to: points[points.length - 1]?.ts ?? null,
    points,
  };
}

function mapNodeValues(
  bucket: NodeMetricsNodeBucketRecord,
): NodeMetricsNodeValuesView {
  return {
    cpuUsagePct: bucket.cpuUsagePct,
    memoryUsagePct: bucket.memoryUsagePct,
    diskUsagePct: bucket.diskUsagePct,
    cpuTemperatureC: bucket.cpuTemperatureC,
    networkRxBytesSec: bucket.networkRxBytesSec,
    networkTxBytesSec: bucket.networkTxBytesSec,
  };
}

function mapWorkloadValues(
  bucket: NodeMetricsWorkloadBucketRecord,
): NodeMetricsWorkloadValuesView {
  return {
    workloadId: bucket.workloadId,
    cpuUsagePct: bucket.cpuUsagePct,
    memoryUsagePct: bucket.memoryUsagePct,
  };
}

function mapWorkloadView(workload: NodeMetricsWorkloadRecord) {
  return {
    workloadId: workload.workloadId,
    workloadType: workload.workloadType,
    name: workload.name,
    status: workload.status,
    latestCpuUsagePct: workload.cpuUsagePct,
    latestMemoryUsagePct: workload.memoryUsagePct,
  };
}

function isMetricsAbnormalWorkload(
  workload: NodeMetricsWorkloadRecord,
): boolean {
  return (
    workload.healthStatus.trim().toLowerCase() === 'unhealthy' ||
    workload.status.trim().toLowerCase() !== 'running' ||
    workload.restartCount > 0
  );
}

function computeFreshnessSec(summaryTs: string): number {
  const parsed = parseTimestamp(summaryTs);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
}

function toIsoString(summaryTs: string): string {
  const parsed = parseTimestamp(summaryTs);
  if (!Number.isFinite(parsed)) {
    return new Date(0).toISOString();
  }

  return new Date(parsed).toISOString();
}

function parseTimestamp(summaryTs: string): number {
  if (!summaryTs || typeof summaryTs !== 'string') {
    return Number.NaN;
  }

  const normalized = summaryTs.includes('T')
    ? summaryTs
    : summaryTs.replace(' ', 'T');
  return new Date(normalized).getTime();
}
