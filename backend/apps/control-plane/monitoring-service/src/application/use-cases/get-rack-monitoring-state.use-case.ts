import { Inject, Injectable } from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertCurrentStateCategory,
  AlertCurrentStateSeverity,
  AlertCurrentStateStatus,
} from '../../domain/alert-current-state';
import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import {
  RackContextProvider,
  type RackContextRecord,
} from '../ports/rack-context.provider';

export type RackMonitoringStateItemView = {
  rackId: string;
  rackName: string;
  rackCode: string;
  operational: {
    severityCode: number;
    overrideFlag: boolean;
    lifecycleStatus: 'active' | 'resolved';
    fingerprint: string;
    firstObservedAt: string;
    lastObservedAt: string;
    lastStateChangedAt: string;
    openedAt: string | null;
    resolvedAt: string | null;
  };
  notification: {
    syncStatus:
      | 'idle'
      | 'pending_open'
      | 'open_synced'
      | 'pending_resolve'
      | 'resolve_synced'
      | 'sync_failed';
    lastNotificationAttemptAt: string | null;
    lastNotificationSyncedAt: string | null;
  };
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
  primaryAlert: {
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
  } | null;
  activeAlerts: Array<{
    fingerprint: string;
    alertName: string;
    severity: AlertCurrentStateSeverity;
    category: AlertCurrentStateCategory;
    status: AlertCurrentStateStatus;
    summary: string;
    startsAt: string;
  }>;
};

export type RackMonitoringStateResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'monitoring_state';
  items: RackMonitoringStateItemView[];
};

@Injectable()
export class GetRackMonitoringStateUseCase {
  constructor(
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
  ) {}

  async execute(): Promise<RackMonitoringStateResponseView> {
    const alerts = await this.alertCurrentStateRepository.listActiveRackAlerts();
    const alertsByRackId = groupAlertsByRackId(alerts);
    const rackIds = Array.from(alertsByRackId.keys());
    const rackContextMap = await this.rackContextProvider.batchGetRacks(rackIds);
    const items = rackIds
      .map((rackId) =>
        this.toRackMonitoringStateItem(
          rackId,
          alertsByRackId.get(rackId) ?? [],
          rackContextMap.get(rackId),
        ),
      )
      .sort(compareRackItems);

    return {
      generatedAt: new Date().toISOString(),
      scope: 'rack',
      view: 'monitoring_state',
      items,
    };
  }

  private toRackMonitoringStateItem(
    rackId: string,
    alerts: AlertCurrentState[],
    rackContext?: RackContextRecord,
  ): RackMonitoringStateItemView {
    const sortedAlerts = [...alerts].sort(compareAlertsForPrimarySelection);
    const primaryAlert = sortedAlerts[0] ?? null;
    const alertSummary = {
      critical: sortedAlerts.filter((alert) => alert.severity === 'critical')
        .length,
      warning: sortedAlerts.filter((alert) => alert.severity === 'warning')
        .length,
    };
    const firstObservedAt = minIsoOrFallback(
      sortedAlerts.map((alert) => alert.startsAt),
    );
    const lastObservedAt = maxIsoOrFallback(
      sortedAlerts.map((alert) => alert.lastReceivedAt),
    );
    const lastNotificationSyncedAt = maxIsoOrNull(
      sortedAlerts.map((alert) => alert.lastSyncedAt),
    );
    const state = {
      status: sortedAlerts.length > 0 ? 'alerting' : 'healthy',
      highestSeverity: getHighestSeverity(sortedAlerts),
      activeAlertCount: sortedAlerts.length,
      lastChangedAt: maxIsoOrNull(
        sortedAlerts.map((alert) => alert.lastStatusChangedAt),
      ),
    } as const;

    return {
      rackId,
      rackName: rackContext?.displayName?.trim() || rackId,
      rackCode: rackContext?.rackCode || rackId,
      operational: {
        severityCode: mapSeverityToSeverityCode(state.highestSeverity),
        overrideFlag: state.highestSeverity === 'critical',
        lifecycleStatus: state.status === 'alerting' ? 'active' : 'resolved',
        fingerprint: primaryAlert?.fingerprint ?? `rack:${rackId}|healthy`,
        firstObservedAt,
        lastObservedAt,
        lastStateChangedAt: state.lastChangedAt ?? new Date(0).toISOString(),
        openedAt: primaryAlert?.startsAt ?? null,
        resolvedAt: null,
      },
      notification: {
        syncStatus: state.status === 'alerting' ? 'open_synced' : 'idle',
        lastNotificationAttemptAt: null,
        lastNotificationSyncedAt,
      },
      state,
      alertSummary,
      primaryAlert: primaryAlert
        ? {
            fingerprint: primaryAlert.fingerprint,
            alertName: primaryAlert.alertName,
            severity: primaryAlert.severity,
            category: primaryAlert.category,
            status: primaryAlert.status,
            summary: primaryAlert.summary,
            description: primaryAlert.description,
            startsAt: primaryAlert.startsAt,
            endsAt: primaryAlert.endsAt,
            dashboardUrl: primaryAlert.dashboardUrl,
            runbookUrl: primaryAlert.runbookUrl,
          }
        : null,
      activeAlerts: sortedAlerts.map((alert) => ({
        fingerprint: alert.fingerprint,
        alertName: alert.alertName,
        severity: alert.severity,
        category: alert.category,
        status: alert.status,
        summary: alert.summary,
        startsAt: alert.startsAt,
      })),
    };
  }
}

function groupAlertsByRackId(
  alerts: AlertCurrentState[],
): Map<string, AlertCurrentState[]> {
  const grouped = new Map<string, AlertCurrentState[]>();

  for (const alert of alerts) {
    if (alert.scopeType !== 'rack') {
      continue;
    }

    const existing = grouped.get(alert.rackId);
    if (existing) {
      existing.push(alert);
      continue;
    }

    grouped.set(alert.rackId, [alert]);
  }

  return grouped;
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

function compareRackItems(
  left: RackMonitoringStateItemView,
  right: RackMonitoringStateItemView,
): number {
  return (
    compareSeverity(right.state.highestSeverity, left.state.highestSeverity) ||
    (right.state.lastChangedAt ?? '').localeCompare(left.state.lastChangedAt ?? '') ||
    left.rackId.localeCompare(right.rackId)
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

function minIsoOrFallback(values: string[]): string {
  return [...values].sort((left, right) => left.localeCompare(right))[0]
    ?? new Date(0).toISOString();
}

function maxIsoOrFallback(values: string[]): string {
  return [...values].sort((left, right) => right.localeCompare(left))[0]
    ?? new Date(0).toISOString();
}

function maxIsoOrNull(values: string[]): string | null {
  return [...values].sort((left, right) => right.localeCompare(left))[0] ?? null;
}
