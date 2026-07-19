import { Inject, Injectable } from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertCurrentStateCategory,
  AlertCurrentStateSeverity,
  AlertCurrentStateStatus,
  AlertIncidentSeverity,
  AlertTriageStatus,
} from '../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';

export type NodeMonitoringStateItemView = {
  node: {
    id: string;
    rackId: string;
  };
  status: {
    state: 'healthy' | 'alerting';
    severity: {
      code: number;
      level: 'none' | 'warning' | 'critical';
    };
    activeAlertCount: number;
    lastChangedAt: string | null;
  };
  timeline: {
    firstObservedAt: string | null;
    lastObservedAt: string | null;
    openedAt: string | null;
    resolvedAt: string | null;
  };
  alertsSummary: {
    bySeverity: {
      critical: number;
      warning: number;
    };
    primaryAlertFingerprint: string | null;
  };
  alerts: NodeActiveAlertView[];
};

export type NodeActiveAlertView = {
  fingerprint: string;
  alertName: string;
  severity: AlertCurrentStateSeverity;
  category: AlertCurrentStateCategory;
  status: AlertCurrentStateStatus;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
  triageStatus: AlertTriageStatus;
  incident: AlertIncidentLinkageView | null;
};

export type AlertIncidentLinkageView = {
  incidentId: string;
  incidentCode: string;
  status: string;
  severity: AlertIncidentSeverity;
  title: string;
  createdAt: string;
  linkedAt: string | null;
};

export type NodeMonitoringStateResponseView = {
  generatedAt: string;
  scope: 'node';
  view: 'node_alert_state';
  items: NodeMonitoringStateItemView[];
};

@Injectable()
export class GetNodeMonitoringStateUseCase {
  constructor(
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
  ) {}

  async execute(): Promise<NodeMonitoringStateResponseView> {
    const alerts = await this.alertCurrentStateRepository.listActiveNodeAlerts();
    const alertsByNodeId = groupAlertsByNodeId(alerts);
    const items = Array.from(alertsByNodeId.entries())
      .map(([nodeId, nodeAlerts]) => this.toNodeMonitoringStateItem(nodeId, nodeAlerts))
      .sort(compareNodeItems);

    return {
      generatedAt: new Date().toISOString(),
      scope: 'node',
      view: 'node_alert_state',
      items,
    };
  }

  private toNodeMonitoringStateItem(
    nodeId: string,
    alerts: AlertCurrentState[],
  ): NodeMonitoringStateItemView {
    const sortedAlerts = [...alerts].sort(compareAlertsForPrimarySelection);
    const primaryAlert = sortedAlerts[0] ?? null;
    const highestSeverity = getHighestSeverity(sortedAlerts);
    const status = {
      state: sortedAlerts.length > 0 ? 'alerting' : 'healthy',
      severity: {
        code: mapSeverityToSeverityCode(highestSeverity),
        level: highestSeverity,
      },
      activeAlertCount: sortedAlerts.length,
      lastChangedAt: maxIsoOrNull(
        sortedAlerts.map((alert) => alert.lastStatusChangedAt),
      ),
    } as const;

    return {
      node: {
        id: nodeId,
        rackId: primaryAlert?.rackId ?? 'unknown',
      },
      status,
      timeline: {
        firstObservedAt: minIsoOrNull(sortedAlerts.map((alert) => alert.startsAt)),
        lastObservedAt: maxIsoOrNull(
          sortedAlerts.map((alert) => alert.lastReceivedAt),
        ),
        openedAt: primaryAlert?.startsAt ?? null,
        resolvedAt: null,
      },
      alertsSummary: {
        bySeverity: {
          critical: sortedAlerts.filter((alert) => alert.severity === 'critical')
            .length,
          warning: sortedAlerts.filter((alert) => alert.severity === 'warning')
            .length,
        },
        primaryAlertFingerprint: primaryAlert?.fingerprint ?? null,
      },
      alerts: sortedAlerts.map(mapActiveAlert),
    };
  }
}

function groupAlertsByNodeId(
  alerts: AlertCurrentState[],
): Map<string, AlertCurrentState[]> {
  const grouped = new Map<string, AlertCurrentState[]>();

  for (const alert of alerts) {
    if (alert.scopeType !== 'node') {
      continue;
    }

    const existing = grouped.get(alert.nodeId);
    if (existing) {
      existing.push(alert);
      continue;
    }

    grouped.set(alert.nodeId, [alert]);
  }

  return grouped;
}

function mapActiveAlert(alert: AlertCurrentState): NodeActiveAlertView {
  return {
    fingerprint: alert.fingerprint,
    alertName: alert.alertName,
    severity: alert.severity,
    category: alert.category,
    status: alert.status,
    summary: alert.summary,
    description: alert.description,
    startsAt: alert.startsAt,
    endsAt: alert.endsAt,
    dashboardUrl: alert.dashboardUrl,
    runbookUrl: alert.runbookUrl,
    triageStatus: alert.triageStatus,
    incident: mapIncidentLinkage(alert),
  };
}

function mapIncidentLinkage(
  alert: AlertCurrentState,
): AlertIncidentLinkageView | null {
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

function compareAlertsForPrimarySelection(
  left: AlertCurrentState,
  right: AlertCurrentState,
): number {
  return (
    compareSeverity(right.severity, left.severity) ||
    right.lastStatusChangedAt.localeCompare(left.lastStatusChangedAt) ||
    right.startsAt.localeCompare(left.startsAt) ||
    left.alertName.localeCompare(right.alertName)
  );
}

function compareNodeItems(
  left: NodeMonitoringStateItemView,
  right: NodeMonitoringStateItemView,
): number {
  return (
    compareSeverity(right.status.severity.level, left.status.severity.level) ||
    (right.status.lastChangedAt ?? '').localeCompare(left.status.lastChangedAt ?? '') ||
    left.node.id.localeCompare(right.node.id)
  );
}

function getHighestSeverity(
  alerts: AlertCurrentState[],
): 'none' | AlertCurrentStateSeverity {
  if (alerts.some((alert) => alert.severity === 'critical')) {
    return 'critical';
  }

  if (alerts.some((alert) => alert.severity === 'warning')) {
    return 'warning';
  }

  return 'none';
}

function compareSeverity(
  left: 'none' | AlertCurrentStateSeverity,
  right: 'none' | AlertCurrentStateSeverity,
): number {
  return severityWeight(left) - severityWeight(right);
}

function severityWeight(
  severity: 'none' | AlertCurrentStateSeverity,
): number {
  switch (severity) {
    case 'critical':
      return 2;
    case 'warning':
      return 1;
    case 'none':
      return 0;
  }
}

function maxIsoOrNull(values: string[]): string | null {
  return [...values].sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function minIsoOrNull(values: string[]): string | null {
  return [...values].sort((left, right) => left.localeCompare(right))[0] ?? null;
}

function mapSeverityToSeverityCode(
  severity: 'none' | AlertCurrentStateSeverity,
): number {
  switch (severity) {
    case 'critical':
      return 3;
    case 'warning':
      return 2;
    case 'none':
      return 0;
  }
}
