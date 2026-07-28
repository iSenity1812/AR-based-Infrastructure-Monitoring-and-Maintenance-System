import type { NodeLiveMetrics } from '../types';
import { requestApiData } from './api-client';

type MetricSeries = {
  cpuUsagePct: Array<number | null>;
  memoryUsagePct: Array<number | null>;
  diskUsagePct: Array<number | null>;
  cpuTemperatureC: Array<number | null>;
  networkRxBytesSec: Array<number | null>;
  networkTxBytesSec: Array<number | null>;
};

type NodeMetricsResponse = {
  nodeId: string;
  metricsConfig: {
    bucketSec: number;
  };
  seedWindow: {
    timestamps: string[];
    nodeMetrics: MetricSeries;
  };
};

export async function fetchLatestNodeMetrics(
  apiBaseUrl: string,
  nodeId: string,
  token: string,
  signal?: AbortSignal,
): Promise<NodeLiveMetrics | null> {
  const baseUrl = apiBaseUrl.trim().replace(/\/$/, '');
  const response = await requestApiData<NodeMetricsResponse>(
    `${baseUrl}/monitoring/nodes/${encodeURIComponent(nodeId)}/metrics/live?interval=5`,
    token,
    signal,
  );
  const index = findLatestMetricIndex(response.seedWindow.nodeMetrics);

  if (index < 0) {
    return null;
  }

  const metrics = response.seedWindow.nodeMetrics;

  return {
    nodeId: response.nodeId,
    observedAt: response.seedWindow.timestamps[index] ?? new Date().toISOString(),
    bucketSec: response.metricsConfig.bucketSec,
    cpuUsagePct: metrics.cpuUsagePct[index] ?? null,
    memoryUsagePct: metrics.memoryUsagePct[index] ?? null,
    diskUsagePct: metrics.diskUsagePct[index] ?? null,
    cpuTemperatureC: metrics.cpuTemperatureC[index] ?? null,
    networkRxBytesSec: metrics.networkRxBytesSec[index] ?? null,
    networkTxBytesSec: metrics.networkTxBytesSec[index] ?? null,
  };
}

function findLatestMetricIndex(metrics: MetricSeries): number {
  const series = Object.values(metrics);
  const length = Math.max(0, ...series.map((values) => values.length));

  for (let index = length - 1; index >= 0; index -= 1) {
    if (series.some((values) => values[index] != null)) {
      return index;
    }
  }

  return -1;
}
