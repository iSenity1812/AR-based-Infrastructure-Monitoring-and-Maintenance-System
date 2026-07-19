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
import {
  RackContextProvider,
  type RackContextRecord,
} from '../ports/rack-context.provider';

export type RackMonitoringStateItemView = {
  rack: {
    id: string;
    rackCode: string;
    displayName: string;
    lifecycleState: string | null;
    capacityState: string | null;
    siteCode: string | null;
    roomCode: string | null;
    rowCode: string | null;
    positionCode: string | null;
    capacityLimit: number | null;
    notes: string | null;
    vendor: string | null;
    metadata: Record<string, unknown>;
  };
  status: {
    state: 'healthy' | 'alerting';
    severity: {
      code: number;
      level: 'none' | 'warning' | 'critical';
    };
    activeAlertCount: number;
    lastChangedAt: string | null;
    lifecycleStatus: 'active' | 'resolved';
    override: boolean;
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
  alerts: Array<{
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
  }>;
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
    const firstObservedAt = minIsoOrNull(
      sortedAlerts.map((alert) => alert.startsAt),
    );
    const lastObservedAt = maxIsoOrNull(
      sortedAlerts.map((alert) => alert.lastReceivedAt),
    );
    const lastNotificationSyncedAt = maxIsoOrNull(
      sortedAlerts.map((alert) => alert.lastSyncedAt),
    );
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
      lifecycleStatus: sortedAlerts.length > 0 ? 'active' : 'resolved',
      override: highestSeverity === 'critical',
    } as const;

    return {
      rack: {
        id: rackId,
        rackCode: normalizeRackCode(rackContext, rackId),
        displayName: normalizeRackDisplayName(rackContext, rackId),
        lifecycleState: normalizeNullableString(rackContext?.lifecycleState),
        capacityState: normalizeNullableString(rackContext?.capacityState),
        siteCode: normalizeNullableString(rackContext?.siteCode),
        roomCode: normalizeNullableString(rackContext?.roomCode),
        rowCode: normalizeNullableString(rackContext?.rowCode),
        positionCode: normalizeNullableString(rackContext?.positionCode),
        capacityLimit: rackContext?.capacityLimit ?? null,
        notes: normalizeNullableString(rackContext?.notes),
        vendor: normalizeNullableString(rackContext?.vendor),
        metadata: rackContext?.metadata ?? {},
      },
      status,
      timeline: {
        firstObservedAt,
        lastObservedAt,
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
      alerts: sortedAlerts.map((alert) => ({
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
      })),
      notification: {
        syncStatus: status.state === 'alerting' ? 'open_synced' : 'idle',
        lastNotificationAttemptAt: null,
        lastNotificationSyncedAt,
      },
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

function compareRackItems(
  left: RackMonitoringStateItemView,
  right: RackMonitoringStateItemView,
): number {
  return (
    compareSeverity(right.status.severity.level, left.status.severity.level) ||
    (right.status.lastChangedAt ?? '').localeCompare(left.status.lastChangedAt ?? '') ||
    left.rack.id.localeCompare(right.rack.id)
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

function minIsoOrNull(values: string[]): string | null {
  return [...values].sort((left, right) => left.localeCompare(right))[0] ?? null;
}

function maxIsoOrNull(values: string[]): string | null {
  return [...values].sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function normalizeRackCode(
  rackContext: RackContextRecord | undefined,
  rackId: string,
): string {
  return rackContext?.rackCode?.trim() || rackId;
}

function normalizeRackDisplayName(
  rackContext: RackContextRecord | undefined,
  rackId: string,
): string {
  return rackContext?.displayName?.trim() || rackId;
}

function normalizeNullableString(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
