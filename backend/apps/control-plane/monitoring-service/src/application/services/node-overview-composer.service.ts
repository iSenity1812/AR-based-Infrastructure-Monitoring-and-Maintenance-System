import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  NodeOverviewReadRepository,
  type NodeOverviewSnapshotRecord,
  type NodeOverviewWorkloadRecord,
} from '../ports/node-overview-read.repository';

export type NodeOverviewStatus = 'healthy' | 'alerting' | 'unknown';
export type NodeOverviewSeverity =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'unknown';

export type NodeOverviewResponseView = {
  node: {
    nodeId: string;
    status: NodeOverviewStatus;
    severity: NodeOverviewSeverity;
    lastSeenAt: string;
    freshnessSec: number;
  };
  summaryMetrics: {
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    diskUsagePct: number | null;
    cpuTemperatureC: number | null;
    networkRxBytesSec: number | null;
    networkTxBytesSec: number | null;
    primaryNicStatus: string | null;
    worstMetric: {
      metricKey: string | null;
      metricValueNumeric: number | null;
      metricValueText: string | null;
    };
    alertCounters: {
      criticalMetricCount: number;
      warningMetricCount: number;
      staleMetricCount: number;
    };
  };
  workloadSummary: {
    total: number;
    unhealthy: number;
    nonRunning: number;
    highCpu: number;
    highMemory: number;
    returned: number;
    selectionMode: 'abnormal_first_then_top_cpu';
  };
  workloads: Array<{
    workloadId: string;
    workloadType: 'container';
    name: string;
    serviceName: string;
    status: string;
    healthStatus: string;
    cpuUsagePct: number | null;
    memoryUsagePct: number | null;
    restartCount: number;
    pidCount: number;
    worstMetricKey: string | null;
    isAbnormal: boolean;
  }>;
  realtime: {
    channel: 'monitoring.node.overview.updated';
    version: 1;
  };
};

const HIGH_CPU_THRESHOLD_PCT = 80;
const HIGH_MEMORY_THRESHOLD_PCT = 80;
const MAX_OVERVIEW_WORKLOADS = 5;

@Injectable()
export class NodeOverviewComposerService {
  constructor(
    @Inject(NodeOverviewReadRepository)
    private readonly nodeOverviewReadRepository: NodeOverviewReadRepository,
  ) {}

  async buildOverview(nodeId: string): Promise<NodeOverviewResponseView> {
    const snapshot =
      await this.nodeOverviewReadRepository.getCurrentNode(nodeId);
    if (!snapshot) {
      throw new NotFoundException(
        `Node overview snapshot not found for nodeId=${nodeId}`,
      );
    }

    const workloads =
      await this.nodeOverviewReadRepository.listNodeWorkloads(nodeId);
    const lastSeenAt = toIsoString(snapshot.summaryTs);
    const freshnessSec = computeFreshnessSec(snapshot.summaryTs);
    const selectedWorkloads = selectOverviewWorkloads(workloads);

    return {
      node: {
        nodeId: snapshot.nodeId,
        status: deriveNodeOverviewStatus(snapshot, freshnessSec),
        severity: deriveNodeOverviewSeverity(snapshot, freshnessSec),
        lastSeenAt,
        freshnessSec,
      },
      summaryMetrics: {
        cpuUsagePct: snapshot.cpuUsagePctCurrent,
        memoryUsagePct: snapshot.memoryUsagePctCurrent,
        diskUsagePct: snapshot.diskUsagePctCurrent,
        cpuTemperatureC: snapshot.cpuTemperatureCCurrent,
        networkRxBytesSec: snapshot.networkRxBytesSecCurrent,
        networkTxBytesSec: snapshot.networkTxBytesSecCurrent,
        primaryNicStatus: snapshot.primaryNicStatusCurrent,
        worstMetric: {
          metricKey: snapshot.worstMetricKey,
          metricValueNumeric: snapshot.worstMetricValueNumeric,
          metricValueText: snapshot.worstMetricValueText,
        },
        alertCounters: {
          criticalMetricCount: snapshot.criticalMetricCount,
          warningMetricCount: snapshot.warningMetricCount,
          staleMetricCount: snapshot.staleMetricCount,
        },
      },
      workloadSummary: {
        total: workloads.length,
        unhealthy: workloads.filter((workload) => isUnhealthy(workload)).length,
        nonRunning: workloads.filter((workload) => !isRunning(workload)).length,
        highCpu: workloads.filter((workload) => isHighCpuWorkload(workload))
          .length,
        highMemory: workloads.filter((workload) =>
          isHighMemoryWorkload(workload),
        ).length,
        returned: selectedWorkloads.length,
        selectionMode: 'abnormal_first_then_top_cpu',
      },
      workloads: selectedWorkloads.map((workload) => ({
        workloadId: workload.workloadId,
        workloadType: workload.workloadType,
        name: workload.name,
        serviceName: workload.serviceName,
        status: workload.status,
        healthStatus: workload.healthStatus,
        cpuUsagePct: workload.cpuUsagePct,
        memoryUsagePct: workload.memoryUsagePct,
        restartCount: workload.restartCount,
        pidCount: workload.pidCount,
        worstMetricKey: workload.worstMetricKey,
        isAbnormal: isAbnormalWorkload(workload),
      })),
      realtime: {
        channel: 'monitoring.node.overview.updated',
        version: 1,
      },
    };
  }
}

export function deriveNodeOverviewStatus(
  snapshot: NodeOverviewSnapshotRecord,
  freshnessSec: number,
): NodeOverviewStatus {
  if (isSnapshotUnknown(snapshot, freshnessSec)) {
    return 'unknown';
  }

  if (snapshot.criticalMetricCount > 0 || snapshot.warningMetricCount > 0) {
    return 'alerting';
  }

  return 'healthy';
}

export function deriveNodeOverviewSeverity(
  snapshot: NodeOverviewSnapshotRecord,
  freshnessSec: number,
): NodeOverviewSeverity {
  if (isSnapshotUnknown(snapshot, freshnessSec)) {
    return 'unknown';
  }

  if (snapshot.criticalMetricCount > 0) {
    return 'high';
  }

  if (snapshot.warningMetricCount > 0) {
    return 'medium';
  }

  return 'none';
}

export function selectOverviewWorkloads(
  workloads: NodeOverviewWorkloadRecord[],
): NodeOverviewWorkloadRecord[] {
  return [...workloads]
    .sort((left, right) => {
      const abnormalDelta =
        Number(isAbnormalWorkload(right)) - Number(isAbnormalWorkload(left));
      if (abnormalDelta !== 0) {
        return abnormalDelta;
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

      return left.name.localeCompare(right.name);
    })
    .slice(0, MAX_OVERVIEW_WORKLOADS);
}

function isSnapshotUnknown(
  snapshot: NodeOverviewSnapshotRecord,
  freshnessSec: number,
): boolean {
  return (
    freshnessSec < 0 ||
    (snapshot.isAnyStale >= 1 &&
      snapshot.staleMetricCount > 0 &&
      snapshot.criticalMetricCount === 0 &&
      snapshot.warningMetricCount === 0)
  );
}

function computeFreshnessSec(summaryTs: string): number {
  const summaryDate = parseSummaryDate(summaryTs);
  if (!summaryDate) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - summaryDate.getTime()) / 1000));
}

function toIsoString(summaryTs: string): string {
  const summaryDate = parseSummaryDate(summaryTs);
  if (!summaryDate) {
    return new Date(0).toISOString();
  }

  return summaryDate.toISOString();
}

function parseSummaryDate(summaryTs: string): Date | null {
  if (!summaryTs || typeof summaryTs !== 'string') {
    return null;
  }

  const normalized = summaryTs.includes('T')
    ? summaryTs
    : summaryTs.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function isAbnormalWorkload(workload: NodeOverviewWorkloadRecord): boolean {
  return (
    isUnhealthy(workload) || !isRunning(workload) || workload.restartCount > 0
  );
}

function isUnhealthy(workload: NodeOverviewWorkloadRecord): boolean {
  return workload.healthStatus.trim().toLowerCase() === 'unhealthy';
}

function isRunning(workload: NodeOverviewWorkloadRecord): boolean {
  return workload.status.trim().toLowerCase() === 'running';
}

function isHighCpuWorkload(workload: NodeOverviewWorkloadRecord): boolean {
  return (workload.cpuUsagePct ?? -1) >= HIGH_CPU_THRESHOLD_PCT;
}

function isHighMemoryWorkload(workload: NodeOverviewWorkloadRecord): boolean {
  return (workload.memoryUsagePct ?? -1) >= HIGH_MEMORY_THRESHOLD_PCT;
}
