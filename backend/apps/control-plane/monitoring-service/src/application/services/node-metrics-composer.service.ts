import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  type NodeMetricsRangeInput,
  NodeMetricsReadRepository,
  type NodeMetricsNodeBucketRecord,
  type NodeMetricsSeedWindowQuery,
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
  nodeId: string;
  metricsConfig: {
    transport: 'socket.io';
    channel: string;
    bucketSec: 60;
    retentionSec: 900;
    nodeMetricKeys: NodeMetricKey[];
    workloadMetricKeys: WorkloadMetricKey[];
  };
  meta: {
    units: {
      cpuUsagePct: '%';
      memoryUsagePct: '%';
      diskUsagePct: '%';
      cpuTemperatureC: 'C';
      networkRxBytesSec: 'bytes/sec';
      networkTxBytesSec: 'bytes/sec';
      workloadCpuUsagePct: '%';
      workloadMemoryUsagePct: '%';
    };
  };
  workloads: Array<{
    workloadId: string;
    workloadType: 'container';
    name: string;
  }>;
  seedWindow: {
    from: string | null;
    to: string | null;
    resolutionSec: 60;
    timestamps: string[];
    nodeMetrics: NodeMetricsSeriesView;
    workloadMetrics: Record<string, WorkloadMetricsSeriesView>;
  };
};

export type NodeMetricsUpdatedEventView = {
  event: typeof NODE_METRICS_UPDATED_EVENT;
  nodeId: string;
  channel: string;
  ts: string;
  bucketSec: 60;
  node: NodeMetricsNodeValuesView;
  workloads: Record<string, Omit<NodeMetricsWorkloadValuesView, 'workloadId'>>;
};

export type NodeMetricsWorkloadsChangedEventView = {
  event: typeof NODE_METRICS_WORKLOADS_CHANGED_EVENT;
  nodeId: string;
  channel: string;
  ts: string;
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

type NodeMetricsSeriesView = {
  cpuUsagePct: Array<number | null>;
  memoryUsagePct: Array<number | null>;
  diskUsagePct: Array<number | null>;
  cpuTemperatureC: Array<number | null>;
  networkRxBytesSec: Array<number | null>;
  networkTxBytesSec: Array<number | null>;
};

type WorkloadMetricsSeriesView = {
  cpuUsagePct: Array<number | null>;
  memoryUsagePct: Array<number | null>;
};

const BUCKET_SEC = 60;
const RETENTION_SEC = 900;
const MAX_SEED_POINTS = 500;
const MAX_TRACKED_WORKLOADS = 5;
const DEFAULT_SELECTION_MODE: NodeMetricsSelectionMode = 'top_cpu_then_memory';

@Injectable()
export class NodeMetricsComposerService {
  constructor(
    @Inject(NodeMetricsReadRepository)
    private readonly nodeMetricsReadRepository: NodeMetricsReadRepository,
  ) {}

  async buildMetrics(
    nodeId: string,
    range?: NodeMetricsRangeInput,
  ): Promise<NodeMetricsResponseView> {
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
    const window = resolveMetricsSeedWindow(range);
    const [nodeBuckets, workloadBuckets] = await Promise.all([
      this.nodeMetricsReadRepository.listNodeSeedBuckets(
        nodeId,
        window,
      ),
      this.nodeMetricsReadRepository.listWorkloadSeedBuckets(
        nodeId,
        trackedWorkloadIds,
        window,
      ),
    ]);

    return {
      nodeId: currentNode.nodeId,
      metricsConfig: buildMetricsConfig(nodeId),
      meta: buildMetricsMeta(),
      workloads: trackedWorkloads.map(mapWorkloadView),
      seedWindow: buildSeedWindow(
        window,
        nodeBuckets,
        workloadBuckets,
        trackedWorkloadIds,
      ),
    };
  }

  async buildUpdatedEvent(
    nodeId: string,
  ): Promise<NodeMetricsUpdatedEventView | null> {
    const currentNode = await this.nodeMetricsReadRepository.getCurrentNode(
      nodeId,
    );
    if (!currentNode) {
      return null;
    }

    const workloads = await this.nodeMetricsReadRepository.listNodeWorkloads(nodeId);
    const trackedWorkloadIds = selectNodeMetricsWorkloads(workloads).map(
      (workload) => workload.workloadId,
    );
    const isNodeStale = computeFreshnessSec(currentNode.summaryTs) > BUCKET_SEC;
    const eventTs = toBucketIsoString(
      isNodeStale ? new Date().toISOString() : currentNode.summaryTs,
      BUCKET_SEC,
    );

    return {
      event: NODE_METRICS_UPDATED_EVENT,
      nodeId,
      channel: buildNodeMetricsChannel(nodeId),
      ts: eventTs,
      bucketSec: BUCKET_SEC,
      node: isNodeStale
        ? buildNullNodeValues()
        : mapCurrentNodeValues(currentNode),
      workloads: Object.fromEntries(
        workloads
          .filter((workload) => trackedWorkloadIds.includes(workload.workloadId))
          .map((workload) => [
            workload.workloadId,
            isNodeStale ? buildNullWorkloadValues() : mapCurrentWorkloadValues(workload),
          ]),
      ),
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
      channel: buildNodeMetricsWorkloadsChangedChannel(nodeId),
      ts: toIsoString(latestTs),
      workloadSummary: buildWorkloadSummary(workloads.length, trackedWorkloads),
      workloads: trackedWorkloads.map(mapWorkloadMembershipEventView),
    };
  }
}

export function buildMetricsConfig(
  nodeId: string,
): NodeMetricsResponseView['metricsConfig'] {
  return {
    transport: 'socket.io',
    channel: buildNodeMetricsChannel(nodeId),
    bucketSec: BUCKET_SEC,
    retentionSec: RETENTION_SEC,
    nodeMetricKeys: [...NODE_METRIC_KEYS],
    workloadMetricKeys: [...WORKLOAD_METRIC_KEYS],
  };
}

export function buildMetricsMeta(): NodeMetricsResponseView['meta'] {
  return {
    units: {
      cpuUsagePct: '%',
      memoryUsagePct: '%',
      diskUsagePct: '%',
      cpuTemperatureC: 'C',
      networkRxBytesSec: 'bytes/sec',
      networkTxBytesSec: 'bytes/sec',
      workloadCpuUsagePct: '%',
      workloadMemoryUsagePct: '%',
    },
  };
}

export function buildNodeMetricsChannel(nodeId: string): string {
  return `monitoring.node.${nodeId}.metrics.updated`;
}

export function buildNodeMetricsWorkloadsChangedChannel(nodeId: string): string {
  return `monitoring.node.${nodeId}.metrics.workloads.changed`;
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
  workloads:
    | NodeMetricsResponseView['workloads']
    | NodeMetricsWorkloadsChangedEventView['workloads'],
): string {
  return workloads.map((workload) => workload.workloadId).join('|');
}

function buildWorkloadSummary(
  total: number,
  trackedWorkloads: NodeMetricsWorkloadRecord[],
): NodeMetricsWorkloadsChangedEventView['workloadSummary'] {
  return {
    total,
    returned: trackedWorkloads.length,
    selectionMode: DEFAULT_SELECTION_MODE,
  };
}

function buildSeedWindow(
  window: NodeMetricsSeedWindowQuery,
  nodeBuckets: NodeMetricsNodeBucketRecord[],
  workloadBuckets: NodeMetricsWorkloadBucketRecord[],
  trackedWorkloadIds: string[],
): NodeMetricsResponseView['seedWindow'] {
  const normalizedNodeBuckets = [...nodeBuckets].sort((left, right) => {
    return parseTimestamp(left.ts) - parseTimestamp(right.ts);
  });
  const timestamps = normalizedNodeBuckets.map((bucket) => toIsoString(bucket.ts));
  const workloadBucketsByWorkloadIdAndTs = new Map<
    string,
    Map<string, NodeMetricsWorkloadBucketRecord>
  >();

  for (const bucket of workloadBuckets) {
    const workloadId = bucket.workloadId;
    const ts = toIsoString(bucket.ts);
    const bucketsByTs = workloadBucketsByWorkloadIdAndTs.get(workloadId) ?? new Map();
    bucketsByTs.set(ts, bucket);
    workloadBucketsByWorkloadIdAndTs.set(workloadId, bucketsByTs);
  }

  const bucketByTs = new Map(
    normalizedNodeBuckets.map((bucket) => [toIsoString(bucket.ts), bucket] as const),
  );
  const completeTimestamps = buildCompleteTimestampGrid(
    window.fromTs,
    window.toTs,
    window.resolutionSec,
  );
  const nodeMetrics: NodeMetricsSeriesView = {
    cpuUsagePct: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.cpuUsagePct ?? null,
    ),
    memoryUsagePct: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.memoryUsagePct ?? null,
    ),
    diskUsagePct: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.diskUsagePct ?? null,
    ),
    cpuTemperatureC: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.cpuTemperatureC ?? null,
    ),
    networkRxBytesSec: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.networkRxBytesSec ?? null,
    ),
    networkTxBytesSec: completeTimestamps.map(
      (timestamp) => bucketByTs.get(timestamp)?.networkTxBytesSec ?? null,
    ),
  };

  const workloadMetrics = Object.fromEntries(
    trackedWorkloadIds.map((workloadId) => {
      const bucketsByTs = workloadBucketsByWorkloadIdAndTs.get(workloadId) ?? new Map();
      return [
        workloadId,
        {
          cpuUsagePct: completeTimestamps.map(
            (timestamp) => bucketsByTs.get(timestamp)?.cpuUsagePct ?? null,
          ),
          memoryUsagePct: completeTimestamps.map(
            (timestamp) => bucketsByTs.get(timestamp)?.memoryUsagePct ?? null,
          ),
        } satisfies WorkloadMetricsSeriesView,
      ];
    }),
  );

  return {
    from: completeTimestamps[0] ?? null,
    to: completeTimestamps[completeTimestamps.length - 1] ?? null,
    resolutionSec: window.resolutionSec as 60,
    timestamps: completeTimestamps,
    nodeMetrics,
    workloadMetrics,
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

function mapCurrentNodeValues(currentNode: {
  cpuUsagePct: number | null;
  memoryUsagePct: number | null;
  diskUsagePct: number | null;
  cpuTemperatureC: number | null;
  networkRxBytesSec: number | null;
  networkTxBytesSec: number | null;
}): NodeMetricsNodeValuesView {
  return {
    cpuUsagePct: currentNode.cpuUsagePct,
    memoryUsagePct: currentNode.memoryUsagePct,
    diskUsagePct: currentNode.diskUsagePct,
    cpuTemperatureC: currentNode.cpuTemperatureC,
    networkRxBytesSec: currentNode.networkRxBytesSec,
    networkTxBytesSec: currentNode.networkTxBytesSec,
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
  };
}

function mapCurrentWorkloadValues(
  workload: NodeMetricsWorkloadRecord,
): Omit<NodeMetricsWorkloadValuesView, 'workloadId'> {
  return {
    cpuUsagePct: workload.cpuUsagePct,
    memoryUsagePct: workload.memoryUsagePct,
  };
}

function mapWorkloadMembershipEventView(workload: NodeMetricsWorkloadRecord) {
  return {
    workloadId: workload.workloadId,
    workloadType: workload.workloadType,
    name: workload.name,
    status: workload.status,
    latestCpuUsagePct: workload.cpuUsagePct,
    latestMemoryUsagePct: workload.memoryUsagePct,
  };
}

function buildNullNodeValues(): NodeMetricsNodeValuesView {
  return {
    cpuUsagePct: null,
    memoryUsagePct: null,
    diskUsagePct: null,
    cpuTemperatureC: null,
    networkRxBytesSec: null,
    networkTxBytesSec: null,
  };
}

function buildNullWorkloadValues(): Omit<NodeMetricsWorkloadValuesView, 'workloadId'> {
  return {
    cpuUsagePct: null,
    memoryUsagePct: null,
  };
}

export function resolveMetricsSeedWindow(
  range?: NodeMetricsRangeInput,
): NodeMetricsSeedWindowQuery {
  const requestedToMs = floorToMinuteMs(
    range?.to ? parseTimestamp(range.to) : Date.now(),
  );
  const safeToMs = Number.isFinite(requestedToMs)
    ? requestedToMs
    : floorToMinuteMs(Date.now());
  const requestedFromMs = range?.from
    ? floorToMinuteMs(parseTimestamp(range.from))
    : safeToMs - RETENTION_SEC * 1000;
  const safeFromMs = Number.isFinite(requestedFromMs)
    ? Math.min(requestedFromMs, safeToMs)
    : safeToMs - RETENTION_SEC * 1000;
  const rangeSec = Math.max(BUCKET_SEC, Math.floor((safeToMs - safeFromMs) / 1000));
  const resolutionSec = selectResolutionSec(rangeSec);
  const alignedFromMs = floorToResolutionMs(safeFromMs, resolutionSec);
  const alignedToMs = floorToResolutionMs(safeToMs, resolutionSec);

  return {
    fromTs: new Date(alignedFromMs).toISOString(),
    toTs: new Date(alignedToMs).toISOString(),
    resolutionSec,
  };
}

function selectResolutionSec(rangeSec: number): number {
  const candidates = [60, 300, 900, 1800, 3600, 10800, 21600, 43200, 86400];
  for (const candidate of candidates) {
    if (Math.floor(rangeSec / candidate) + 1 <= MAX_SEED_POINTS) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

function buildCompleteTimestampGrid(
  fromTs: string,
  toTs: string,
  resolutionSec: number,
): string[] {
  const timestamps: string[] = [];
  const fromMs = parseTimestamp(fromTs);
  const toMs = parseTimestamp(toTs);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs < fromMs) {
    return timestamps;
  }

  for (let cursor = fromMs; cursor <= toMs; cursor += resolutionSec * 1000) {
    timestamps.push(new Date(cursor).toISOString());
  }

  return timestamps;
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

function toBucketIsoString(summaryTs: string, bucketSec: number): string {
  const parsed = parseTimestamp(summaryTs);
  if (!Number.isFinite(parsed)) {
    return new Date(0).toISOString();
  }

  return new Date(floorToResolutionMs(parsed, bucketSec)).toISOString();
}

function floorToMinuteMs(value: number): number {
  return floorToResolutionMs(value, BUCKET_SEC);
}

function floorToResolutionMs(value: number, resolutionSec: number): number {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  const stepMs = resolutionSec * 1000;
  return Math.floor(value / stepMs) * stepMs;
}

function parseTimestamp(summaryTs: string): number {
  if (!summaryTs || typeof summaryTs !== 'string') {
    return Number.NaN;
  }

  const normalized = summaryTs.includes('T')
    ? summaryTs
    : `${summaryTs.replace(' ', 'T')}Z`;
  return new Date(normalized).getTime();
}
