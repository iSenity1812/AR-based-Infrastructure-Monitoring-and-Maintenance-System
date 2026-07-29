import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  NodeOverviewReadRepository,
  type NodeOverviewSnapshotRecord,
  type NodeOverviewWorkloadRecord,
} from '../ports/node-overview-read.repository';
import { CollectorLivenessService } from './collector-liveness.service';

export type NodeOverviewStatus = 'healthy' | 'warning' | 'critical' | 'unknown';
export type NodeOverviewReason =
  | 'none'
  | 'warning_metric'
  | 'critical_metric'
  | 'telemetry_stale'
  | 'no_telemetry';
export type NodeOverviewCollectorStatus = 'online' | 'offline' | 'unknown';
export type NodeOverviewCollectorReason =
  | 'none'
  | 'heartbeat_timeout'
  | 'no_heartbeat';
export type NodeOverviewPrimaryIssueType =
  | 'none'
  | 'heartbeat_loss'
  | 'metric_alert';

type NodeOverviewPrimaryIssueView = {
  type: NodeOverviewPrimaryIssueType;
  metricKey: string | null;
  value: number | string | null;
};

export type NodeOverviewResponseView = {
  node: {
    nodeId: string;
    status: NodeOverviewStatus;
    reason: NodeOverviewReason;
    lastSeenAt: string;
    fingerprintSeenAt: string | null;
    hardware: {
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
    };
    collector: {
      status: NodeOverviewCollectorStatus;
      reason: NodeOverviewCollectorReason;
      lastHeartbeatAt: string | null;
      heartbeatTimeoutSec: number;
    };
  };
  summaryMetrics: {
    primaryNicStatus: string | null;
    uptimeSec: number | null;
    primaryIssue: NodeOverviewPrimaryIssueView;
    alertCounters: {
      critical: number;
      warning: number;
      stale: number;
    };
  };
  workloadSummary: {
    total: number;
    unhealthy: number;
    nonRunning: number;
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
    restartCount: number;
    worstMetricKey: string | null;
    isAbnormal: boolean;
  }>;
  realtime: {
    transport: 'socket.io';
    channel: string;
  };
};

const MAX_OVERVIEW_WORKLOADS = 5;

@Injectable()
export class NodeOverviewComposerService {
  constructor(
    @Inject(NodeOverviewReadRepository)
    private readonly nodeOverviewReadRepository: NodeOverviewReadRepository,
    private readonly collectorLivenessService: CollectorLivenessService,
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
    const collectorLiveness =
      await this.collectorLivenessService.getByNodeId(nodeId);
    const lastSeenAt = toIsoString(snapshot.summaryTs);
    const freshnessSec = computeFreshnessSec(snapshot.summaryTs);
    const nodeHealth = deriveNodeOverviewHealth(snapshot, freshnessSec);
    const collector = mapCollectorOverview(collectorLiveness);
    const selectedWorkloads = selectOverviewWorkloads(workloads);

    return {
      node: {
        nodeId: snapshot.nodeId,
        status: nodeHealth.status,
        reason: nodeHealth.reason,
        lastSeenAt,
        fingerprintSeenAt: toOptionalIsoString(snapshot.fingerprintSeenAt),
        hardware: {
          batteryModel: snapshot.batteryModel,
          cpuArchitecture: snapshot.cpuArchitecture,
          cpuModel: snapshot.cpuModel,
          gpuModelPrimary: snapshot.gpuModelPrimary,
          hardwareSerial: snapshot.hardwareSerial,
          logicalCpuCount: snapshot.logicalCpuCount,
          macAddress: snapshot.macAddress,
          motherboardModel: snapshot.motherboardModel,
          osProduct: snapshot.osProduct,
          primaryIpv4: snapshot.primaryIpv4,
          ssdModelPrimary: snapshot.ssdModelPrimary,
        },
        collector,
      },
      summaryMetrics: {
        primaryNicStatus: snapshot.primaryNicStatusCurrent,
        uptimeSec: snapshot.uptimeSecondsCurrent,
        primaryIssue: mapPrimaryIssue(snapshot),
        alertCounters: {
          critical: snapshot.criticalMetricCount,
          warning: snapshot.warningMetricCount,
          stale: snapshot.staleMetricCount,
        },
      },
      workloadSummary: {
        total: workloads.length,
        unhealthy: workloads.filter((workload) => isUnhealthy(workload)).length,
        nonRunning: workloads.filter((workload) => !isRunning(workload)).length,
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
        restartCount: workload.restartCount,
        worstMetricKey: workload.worstMetricKey,
        isAbnormal: isAbnormalWorkload(workload),
      })),
      realtime: {
        transport: 'socket.io',
        channel: buildNodeOverviewChangedChannel(snapshot.nodeId),
      },
    };
  }
}

export function buildNodeOverviewChangedChannel(nodeId: string): string {
  return `monitoring.node.${nodeId}.overview.changed`;
}

export function deriveNodeOverviewStatus(
  snapshot: NodeOverviewSnapshotRecord,
  freshnessSec: number,
): NodeOverviewStatus {
  return deriveNodeOverviewHealth(snapshot, freshnessSec).status;
}

export function deriveNodeOverviewHealth(
  snapshot: NodeOverviewSnapshotRecord,
  freshnessSec: number,
): {
  status: NodeOverviewStatus;
  reason: NodeOverviewReason;
} {
  if (!parseSummaryDate(snapshot.summaryTs)) {
    return { status: 'unknown', reason: 'no_telemetry' };
  }

  if (isSnapshotUnknown(snapshot, freshnessSec)) {
    return { status: 'unknown', reason: 'telemetry_stale' };
  }

  if (snapshot.criticalMetricCount > 0) {
    return { status: 'critical', reason: 'critical_metric' };
  }

  if (snapshot.warningMetricCount > 0) {
    return { status: 'warning', reason: 'warning_metric' };
  }

  return { status: 'healthy', reason: 'none' };
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

function mapCollectorOverview(
  collectorLiveness: Awaited<
    ReturnType<CollectorLivenessService['getByNodeId']>
  >,
): NodeOverviewResponseView['node']['collector'] {
  if (collectorLiveness.collectorStatus === 'ONLINE') {
    return {
      status: 'online',
      reason: 'none',
      lastHeartbeatAt: collectorLiveness.lastHeartbeatAt,
      heartbeatTimeoutSec: collectorLiveness.heartbeatTimeoutSec,
    };
  }

  if (collectorLiveness.collectorStatus === 'OFFLINE') {
    return {
      status: 'offline',
      reason: 'heartbeat_timeout',
      lastHeartbeatAt: collectorLiveness.lastHeartbeatAt,
      heartbeatTimeoutSec: collectorLiveness.heartbeatTimeoutSec,
    };
  }

  return {
    status: 'unknown',
    reason: 'no_heartbeat',
    lastHeartbeatAt: collectorLiveness.lastHeartbeatAt,
    heartbeatTimeoutSec: collectorLiveness.heartbeatTimeoutSec,
  };
}

function mapPrimaryIssue(
  snapshot: NodeOverviewSnapshotRecord,
): NodeOverviewPrimaryIssueView {
  if (!snapshot.worstMetricKey) {
    return {
      type: 'none',
      metricKey: null,
      value: null,
    };
  }

  return {
    type:
      snapshot.worstMetricKey === 'node.heartbeat.loss'
        ? 'heartbeat_loss'
        : 'metric_alert',
    metricKey: snapshot.worstMetricKey,
    value: snapshot.worstMetricValueText ?? snapshot.worstMetricValueNumeric,
  };
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

function toOptionalIsoString(summaryTs: string | null): string | null {
  if (!summaryTs) {
    return null;
  }

  const summaryDate = parseSummaryDate(summaryTs);
  if (!summaryDate) {
    return null;
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
