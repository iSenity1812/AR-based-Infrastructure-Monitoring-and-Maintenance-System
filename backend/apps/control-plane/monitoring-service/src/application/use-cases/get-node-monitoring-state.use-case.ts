import { Inject, Injectable } from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertCurrentStateCategory,
  AlertCurrentStateSeverity,
  AlertCurrentStateStatus,
} from '../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';

export type NodeMonitoringStateItemView = {
  nodeId: string;
  rackId: string;
  state: {
    status: 'healthy' | 'alerting';
    highestSeverity: 'none' | 'warning' | 'critical';
    activeAlertCount: number;
    lastChangedAt: string | null;
  };
  alertSummary: {
    critical: number;
    warning: number;
  };
  primaryAlert: NodePrimaryAlertView | null;
  activeAlerts: NodeActiveAlertView[];
};

export type NodePrimaryAlertView = {
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
};

export type NodeActiveAlertView = {
  fingerprint: string;
  alertName: string;
  severity: AlertCurrentStateSeverity;
  category: AlertCurrentStateCategory;
  status: AlertCurrentStateStatus;
  summary: string;
  startsAt: string;
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
    const alertSummary = {
      critical: sortedAlerts.filter((alert) => alert.severity === 'critical')
        .length,
      warning: sortedAlerts.filter((alert) => alert.severity === 'warning')
        .length,
    };
    const state = {
      status: sortedAlerts.length > 0 ? 'alerting' : 'healthy',
      highestSeverity: getHighestSeverity(sortedAlerts),
      activeAlertCount: sortedAlerts.length,
      lastChangedAt: maxIsoOrNull(
        sortedAlerts.map((alert) => alert.lastStatusChangedAt),
      ),
    } as const;

    return {
      nodeId,
      rackId: primaryAlert?.rackId ?? 'unknown',
      state,
      alertSummary,
      primaryAlert: primaryAlert ? mapPrimaryAlert(primaryAlert) : null,
      activeAlerts: sortedAlerts.map(mapActiveAlert),
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

function mapPrimaryAlert(alert: AlertCurrentState): NodePrimaryAlertView {
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
  };
}

function mapActiveAlert(alert: AlertCurrentState): NodeActiveAlertView {
  return {
    fingerprint: alert.fingerprint,
    alertName: alert.alertName,
    severity: alert.severity,
    category: alert.category,
    status: alert.status,
    summary: alert.summary,
    startsAt: alert.startsAt,
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
    compareSeverity(right.state.highestSeverity, left.state.highestSeverity) ||
    (right.state.lastChangedAt ?? '').localeCompare(left.state.lastChangedAt ?? '') ||
    left.nodeId.localeCompare(right.nodeId)
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
