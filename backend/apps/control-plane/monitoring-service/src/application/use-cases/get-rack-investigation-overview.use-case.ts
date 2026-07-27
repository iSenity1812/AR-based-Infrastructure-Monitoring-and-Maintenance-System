import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertCurrentStateCategory,
  AlertCurrentStateScopeType,
  AlertCurrentStateSeverity,
  AlertCurrentStateStatus,
  AlertIncidentSeverity,
  AlertTriageStatus,
} from '../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import { RackContextProvider } from '../ports/rack-context.provider';
import {
  type RackOverviewNodeSnapshotRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';
import {
  buildRackOverviewItemFromRecord,
  type RackOverviewItemView,
} from './get-rack-overview.use-case';

export type RackInvestigationOverviewSeverity =
  | 'healthy'
  | 'stale'
  | 'warning'
  | 'high'
  | 'critical';

export type RackInvestigationOverviewStatus =
  | 'healthy'
  | 'alerting'
  | 'unknown';

export type RackInvestigationActiveAlertView = {
  fingerprint: string;
  alertName: string;
  scopeType: AlertCurrentStateScopeType;
  nodeId: string | null;
  workloadId: string | null;
  severity: AlertCurrentStateSeverity;
  category: AlertCurrentStateCategory;
  status: AlertCurrentStateStatus;
  summary: string;
  description: string;
  metricKey: string | null;
  currentValue: string | null;
  threshold: string | null;
  startsAt: string;
  endsAt: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
  triageStatus: AlertTriageStatus;
  incident: {
    incidentId: string;
    incidentCode: string;
    status: string;
    severity: AlertIncidentSeverity;
    title: string;
    createdAt: string;
    linkedAt: string | null;
  } | null;
};

export type RackOverviewNodeSnapshotItemView = {
  nodeId: string;
  status: RackInvestigationOverviewStatus;
  severity: RackInvestigationOverviewSeverity;
  lastSeenAt: string;
  freshnessSec: number;
  collectorStatus: 'UNKNOWN';
  alertCounters: {
    criticalMetricCount: number;
    warningMetricCount: number;
    staleMetricCount: number;
  };
  currentMetrics: {
    cpuUsagePct: number | null;
    memoryUsedPct: number | null;
    diskUsedPct: number | null;
    cpuTemperatureC: number | null;
  };
  worstMetric: {
    metricKey: string | null;
    metricValueNumeric: number | null;
    metricValueText: string | null;
  };
};

export type RackInvestigationOverviewResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'rack_investigation_overview';
  rack: RackOverviewItemView;
  alerts: {
    summary: {
      rackAlertCount: number;
      childAlertCount: number;
      criticalCount: number;
      warningCount: number;
    };
    rack: RackInvestigationActiveAlertView[];
    child: RackInvestigationActiveAlertView[];
  };
  nodeSnapshot: {
    totalNodes: number;
    returned: number;
    selectionMode: 'problem_first_then_recent';
    items: RackOverviewNodeSnapshotItemView[];
  };
  navigation: {
    nodesUrl: string;
  };
};

const DEFAULT_NODE_SNAPSHOT_LIMIT = 5;

@Injectable()
export class GetRackInvestigationOverviewUseCase {
  constructor(
    @Inject(RackOverviewReadRepository)
    private readonly rackOverviewReadRepository: RackOverviewReadRepository,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
  ) {}

  async execute(
    rackId: string,
  ): Promise<RackInvestigationOverviewResponseView> {
    const rack = await this.rackOverviewReadRepository.getCurrentRack(rackId);
    if (!rack) {
      throw new NotFoundException(
        `Rack overview snapshot not found for rackId=${rackId}`,
      );
    }

    const generatedAt = new Date();
    const [history, rackContextMap, alerts] = await Promise.all([
      this.rackOverviewReadRepository.listRecentRackHistoryByRackId(rackId),
      this.rackContextProvider.batchGetRacks([rackId]),
      this.alertCurrentStateRepository.listActiveByRackId(rackId),
    ]);
    const mappedAlerts = alerts.map(mapActiveAlert);
    const rackAlerts = mappedAlerts.filter(
      (alert) => alert.scopeType === 'rack',
    );
    const childAlerts = mappedAlerts.filter(
      (alert) => alert.scopeType === 'node' || alert.scopeType === 'workload',
    );
    const snapshotNodeIds = collectProblemFirstNodeIds(
      rack,
      history,
      childAlerts,
      DEFAULT_NODE_SNAPSHOT_LIMIT,
    );
    const nodeSnapshot =
      await this.rackOverviewReadRepository.listNodeSnapshotsByNodeIds(
        snapshotNodeIds,
      );

    return {
      generatedAt: generatedAt.toISOString(),
      scope: 'rack',
      view: 'rack_investigation_overview',
      rack: buildRackOverviewItemFromRecord(
        rack,
        history,
        generatedAt,
        rackContextMap.get(rackId),
      ),
      alerts: {
        summary: buildAlertSummary(rackAlerts, childAlerts),
        rack: rackAlerts,
        child: childAlerts,
      },
      nodeSnapshot: {
        totalNodes: rack.totalNodes,
        returned: nodeSnapshot.length,
        selectionMode: 'problem_first_then_recent',
        items: nodeSnapshot.map(mapNodeSnapshot),
      },
      navigation: {
        nodesUrl: `/monitoring/racks/${encodeURIComponent(rackId)}/nodes`,
      },
    };
  }
}

function collectProblemFirstNodeIds(
  rack: RackOverviewItemView['rackInfo'] extends never
    ? never
    : {
        worstNodeId: string;
      },
  history: Array<{
    worstNodeId: string;
  }>,
  childAlerts: RackInvestigationActiveAlertView[],
  limit: number,
): string[] {
  const nodeIds: string[] = [];

  for (const alert of childAlerts) {
    if (isUsableNodeId(alert.nodeId)) {
      nodeIds.push(alert.nodeId);
    }
  }

  if (isUsableNodeId(rack.worstNodeId)) {
    nodeIds.push(rack.worstNodeId);
  }

  for (const entry of history) {
    if (isUsableNodeId(entry.worstNodeId)) {
      nodeIds.push(entry.worstNodeId);
    }
  }

  return Array.from(new Set(nodeIds)).slice(0, limit);
}

function buildAlertSummary(
  rackAlerts: RackInvestigationActiveAlertView[],
  childAlerts: RackInvestigationActiveAlertView[],
) {
  const allAlerts = [...rackAlerts, ...childAlerts];

  return {
    rackAlertCount: rackAlerts.length,
    childAlertCount: childAlerts.length,
    criticalCount: allAlerts.filter((alert) => alert.severity === 'critical')
      .length,
    warningCount: allAlerts.filter((alert) => alert.severity === 'warning')
      .length,
  };
}

function mapActiveAlert(
  alert: AlertCurrentState,
): RackInvestigationActiveAlertView {
  return {
    fingerprint: alert.fingerprint,
    alertName: alert.alertName,
    scopeType: alert.scopeType,
    nodeId: 'nodeId' in alert ? (alert.nodeId ?? null) : null,
    workloadId: 'workloadId' in alert ? (alert.workloadId ?? null) : null,
    severity: alert.severity,
    category: alert.category,
    status: alert.status,
    summary: alert.summary,
    description: alert.description,
    metricKey: alert.metricKey,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    startsAt: alert.startsAt,
    endsAt: alert.endsAt,
    dashboardUrl: alert.dashboardUrl,
    runbookUrl: alert.runbookUrl,
    triageStatus: alert.triageStatus,
    incident: mapIncidentLinkage(alert),
  };
}

function mapIncidentLinkage(alert: AlertCurrentState) {
  if (
    alert.triageStatus !== 'incident_created' ||
    !alert.incidentId ||
    !alert.incidentCode ||
    !alert.incidentSeverity ||
    !alert.incidentTitle ||
    !alert.incidentCreatedAt
  ) {
    return null;
  }

  return {
    incidentId: alert.incidentId,
    incidentCode: alert.incidentCode,
    status: alert.incidentStatus ?? 'UNKNOWN',
    severity: alert.incidentSeverity,
    title: alert.incidentTitle,
    createdAt: alert.incidentCreatedAt,
    linkedAt: alert.incidentLinkedAt,
  };
}

function mapNodeSnapshot(
  node: RackOverviewNodeSnapshotRecord,
): RackOverviewNodeSnapshotItemView {
  return {
    nodeId: node.nodeId,
    status: deriveNodeStatus(node),
    severity: deriveNodeSeverity(node),
    lastSeenAt: toIsoString(node.summaryTs),
    freshnessSec: computeFreshnessSec(node.summaryTs),
    collectorStatus: 'UNKNOWN',
    alertCounters: {
      criticalMetricCount: node.criticalMetricCount,
      warningMetricCount: node.warningMetricCount,
      staleMetricCount: node.staleMetricCount,
    },
    currentMetrics: {
      cpuUsagePct: node.cpuUsagePctCurrent,
      memoryUsedPct: node.memoryUsagePctCurrent,
      diskUsedPct: node.diskUsagePctCurrent,
      cpuTemperatureC: node.cpuTemperatureCCurrent,
    },
    worstMetric: {
      metricKey: node.worstMetricKey,
      metricValueNumeric: node.worstMetricValueNumeric,
      metricValueText: node.worstMetricValueText,
    },
  };
}

function deriveNodeStatus(
  node: RackOverviewNodeSnapshotRecord,
): RackInvestigationOverviewStatus {
  if (
    node.isAnyStale >= 1 &&
    node.staleMetricCount > 0 &&
    node.criticalMetricCount === 0 &&
    node.warningMetricCount === 0
  ) {
    return 'unknown';
  }

  if (node.criticalMetricCount > 0 || node.warningMetricCount > 0) {
    return 'alerting';
  }

  return 'healthy';
}

function deriveNodeSeverity(
  node: RackOverviewNodeSnapshotRecord,
): RackInvestigationOverviewSeverity {
  if (node.maxSeverityCode >= 4) {
    return 'critical';
  }

  if (node.maxSeverityCode >= 3 || node.criticalMetricCount > 0) {
    return 'high';
  }

  if (node.maxSeverityCode >= 2 || node.warningMetricCount > 0) {
    return 'warning';
  }

  if (
    node.maxSeverityCode >= 1 ||
    node.isAnyStale >= 1 ||
    node.staleMetricCount > 0
  ) {
    return 'stale';
  }

  return 'healthy';
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

function isUsableNodeId(nodeId: string | null | undefined): nodeId is string {
  if (typeof nodeId !== 'string') {
    return false;
  }

  const normalized = nodeId.trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined';
}
