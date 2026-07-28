import {
  ALERT_CURRENT_STATE_CATEGORIES,
  ALERT_CURRENT_STATE_SCOPE_TYPES,
  ALERT_CURRENT_STATE_SEVERITIES,
  createDefaultAlertIncidentLinkage,
  type AlertCurrentState,
  type AlertCurrentStateCategory,
  type AlertCurrentStateSeverity,
  type AlertCurrentStateStatus,
} from '../../domain/alert-current-state';
import type { ExternalAlertSyncRequestDto } from '../../presentation/http/dto/external-alert-sync-request.dto';

export interface SyncExternalAlertsCommand {
  receivedAt: string;
  alerts: SyncExternalAlertInput[];
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
}

export interface SyncExternalAlertInput {
  fingerprint: string;
  status: AlertCurrentStateStatus;
  startsAt: string;
  endsAt: string | null;
  generatorUrl: string | null;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  rawLabels: Record<string, string>;
  rawAnnotations: Record<string, string>;
}

export interface MapExternalAlertCurrentStateInput {
  receivedAt: string;
  alert: SyncExternalAlertInput;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
}

export interface ExternalAlertSyncMetadata {
  fingerprint: string | null;
  alertName: string | null;
  scopeType: string | null;
  nodeId: string | null;
  rackId: string | null;
  workloadId: string | null;
  serviceId: string | null;
}

export type MapExternalAlertCurrentStateResult =
  | {
      kind: 'mapped';
      state: AlertCurrentState;
      metadata: ExternalAlertSyncMetadata;
    }
  | {
      kind: 'invalid';
      reason:
        | 'missing_fingerprint'
        | 'missing_scope_type'
        | 'unsupported_scope_type'
        | 'missing_required_identity'
        | 'invalid_status'
        | 'invalid_severity'
        | 'invalid_category';
      metadata: ExternalAlertSyncMetadata;
    };

type InvalidMapReason = Extract<
  MapExternalAlertCurrentStateResult,
  { kind: 'invalid' }
>['reason'];

export function mapExternalAlertSyncRequestToCommand(
  dto: ExternalAlertSyncRequestDto,
  receivedAt: string,
): SyncExternalAlertsCommand {
  const commonLabels = sanitizeExternalAlertMap(dto.commonLabels);
  const commonAnnotations = sanitizeExternalAlertMap(dto.commonAnnotations);

  return {
    receivedAt,
    commonLabels,
    commonAnnotations,
    alerts: dto.alerts.map((alert) => ({
      fingerprint: alert.fingerprint,
      status: alert.status,
      startsAt: alert.startsAt,
      endsAt: normalizeExternalAlertString(alert.endsAt) ?? null,
      generatorUrl: normalizeExternalAlertString(alert.generatorURL),
      labels: sanitizeExternalAlertMap(alert.labels),
      annotations: sanitizeExternalAlertMap(alert.annotations),
      rawLabels: sanitizeExternalAlertMap(alert.labels),
      rawAnnotations: sanitizeExternalAlertMap(alert.annotations),
    })),
  };
}

export function mapExternalAlertToCurrentState(
  input: MapExternalAlertCurrentStateInput,
): MapExternalAlertCurrentStateResult {
  const labels = mergeExternalAlertLabels(
    input.alert.labels,
    input.commonLabels,
  );
  const annotations = mergeExternalAlertAnnotations(
    input.alert.annotations,
    input.commonAnnotations,
  );

  const fingerprint = normalizeExternalAlertString(input.alert.fingerprint);
  if (!fingerprint) {
    return invalid('missing_fingerprint', {
      fingerprint: null,
      alertName: null,
      scopeType: null,
      nodeId: null,
      rackId: null,
      workloadId: null,
      serviceId: null,
    });
  }

  const alertName =
    normalizeExternalAlertString(labels.alertname) ?? 'ExternalAlert';
  const scopeType = normalizeExternalAlertString(labels.scope_type);
  if (!scopeType) {
    return invalid('missing_scope_type', {
      fingerprint,
      alertName,
      scopeType: null,
      nodeId: null,
      rackId: null,
      workloadId: null,
      serviceId: null,
    });
  }

  if (!isScopeType(scopeType)) {
    return invalid('unsupported_scope_type', {
      fingerprint,
      alertName,
      scopeType,
      nodeId: null,
      rackId: null,
      workloadId: null,
      serviceId: null,
    });
  }

  const severity = normalizeExternalAlertString(labels.severity);
  if (!severity || !isSeverity(severity)) {
    return invalid('invalid_severity', {
      fingerprint,
      alertName,
      scopeType,
      nodeId: normalizeExternalAlertString(labels.node_id),
      rackId: normalizeExternalAlertString(labels.rack_id),
      workloadId: normalizeExternalAlertString(labels.workload_id),
      serviceId: null,
    });
  }

  const category = normalizeExternalAlertString(labels.category);
  if (!category || !isCategory(category)) {
    return invalid('invalid_category', {
      fingerprint,
      alertName,
      scopeType,
      nodeId: normalizeExternalAlertString(labels.node_id),
      rackId: normalizeExternalAlertString(labels.rack_id),
      workloadId: normalizeExternalAlertString(labels.workload_id),
      serviceId: null,
    });
  }

  const status = normalizeExternalAlertString(input.alert.status);
  if (status !== 'firing' && status !== 'resolved') {
    return invalid('invalid_status', {
      fingerprint,
      alertName,
      scopeType,
      nodeId: normalizeExternalAlertString(labels.node_id),
      rackId: normalizeExternalAlertString(labels.rack_id),
      workloadId: normalizeExternalAlertString(labels.workload_id),
      serviceId: null,
    });
  }

  const nodeId = normalizeExternalAlertString(labels.node_id);
  const rackId = normalizeExternalAlertString(labels.rack_id);
  const workloadId = normalizeExternalAlertString(labels.workload_id);
  const serviceId = scopeType === 'service' ? workloadId : null;

  const metadata: ExternalAlertSyncMetadata = {
    fingerprint,
    alertName,
    scopeType,
    nodeId,
    rackId,
    workloadId,
    serviceId,
  };

  const base = {
    fingerprint,
    alertName,
    rawLabels: labels,
    rawAnnotations: annotations,
    severity,
    status,
    category,
    environment: normalizeExternalAlertString(labels.environment) ?? 'unknown',
    team: normalizeExternalAlertString(labels.team) ?? 'unknown',
    source: 'grafana' as const,
    summary: normalizeExternalAlertString(annotations.summary) ?? alertName,
    description:
      normalizeExternalAlertString(annotations.description) ??
      normalizeExternalAlertString(annotations.summary) ??
      `${alertName} external alert`,
    metricKey: normalizeExternalAlertString(annotations.metric_key),
    observedWindow: normalizeExternalAlertString(annotations.observed_window),
    dashboardUrl: normalizeExternalAlertString(annotations.dashboard_url),
    runbookUrl: normalizeExternalAlertString(annotations.runbook_url),
    currentValue: normalizeExternalAlertString(annotations.current_value),
    threshold: normalizeExternalAlertString(annotations.threshold),
    startsAt: input.alert.startsAt,
    endsAt: input.alert.endsAt,
    lastReceivedAt: input.receivedAt,
    firstSyncedAt: input.receivedAt,
    lastSyncedAt: input.receivedAt,
    lastStatusChangedAt: input.receivedAt,
    ...createDefaultAlertIncidentLinkage(),
  } as const;

  switch (scopeType) {
    case 'node':
      if (!nodeId) {
        return invalid('missing_required_identity', metadata);
      }

      return {
        kind: 'mapped',
        metadata,
        state: {
          ...base,
          scopeType: 'node',
          nodeId,
          rackId: rackId ?? 'unknown',
        },
      };
    case 'rack':
      if (!rackId) {
        return invalid('missing_required_identity', metadata);
      }

      return {
        kind: 'mapped',
        metadata,
        state: {
          ...base,
          scopeType: 'rack',
          rackId,
        },
      };
    case 'workload':
      if (!workloadId) {
        return invalid('missing_required_identity', metadata);
      }

      return {
        kind: 'mapped',
        metadata,
        state: {
          ...base,
          scopeType: 'workload',
          workloadId,
          nodeId: nodeId ?? 'unknown',
          rackId: rackId ?? 'unknown',
        },
      };
    case 'service':
      if (!serviceId) {
        return invalid('missing_required_identity', metadata);
      }

      return {
        kind: 'mapped',
        metadata,
        state: {
          ...base,
          scopeType: 'service',
          serviceId,
        },
      };
  }
}

export function normalizeExternalAlertString(
  input: string | null | undefined,
): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const normalized = input.trim();
  if (!normalized || normalized.toLowerCase() === 'null') {
    return null;
  }

  return normalized;
}

export function sanitizeExternalAlertMap(
  input: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce<Record<string, string>>(
    (result, [key, value]) => {
      const normalizedKey = key.trim();
      if (!normalizedKey) {
        return result;
      }

      const stringValue = coerceExternalAlertValue(value);
      if (stringValue === null) {
        return result;
      }

      result[normalizedKey] = stringValue;
      return result;
    },
    {},
  );
}

export function mergeExternalAlertLabels(
  alertLabels: Record<string, string>,
  commonLabels: Record<string, string>,
): Record<string, string> {
  return {
    ...commonLabels,
    ...alertLabels,
  };
}

export function mergeExternalAlertAnnotations(
  alertAnnotations: Record<string, string>,
  commonAnnotations: Record<string, string>,
): Record<string, string> {
  return {
    ...commonAnnotations,
    ...alertAnnotations,
  };
}

function invalid(
  reason: InvalidMapReason,
  metadata: ExternalAlertSyncMetadata,
): MapExternalAlertCurrentStateResult {
  return {
    kind: 'invalid',
    reason,
    metadata,
  };
}

function coerceExternalAlertValue(value: unknown): string | null {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return null;
}

function isScopeType(value: string): value is AlertCurrentState['scopeType'] {
  return (ALERT_CURRENT_STATE_SCOPE_TYPES as readonly string[]).includes(value);
}

function isSeverity(value: string): value is AlertCurrentStateSeverity {
  return (ALERT_CURRENT_STATE_SEVERITIES as readonly string[]).includes(value);
}

function isCategory(value: string): value is AlertCurrentStateCategory {
  return (ALERT_CURRENT_STATE_CATEGORIES as readonly string[]).includes(value);
}
