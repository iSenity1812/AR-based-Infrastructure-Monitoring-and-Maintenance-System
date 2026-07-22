import { createHash } from 'node:crypto';

import type {
  AlertCurrentState,
  AlertCurrentStateSeverity,
  AlertIncidentSeverity,
} from '../../domain/alert-current-state';
import type { AlertEscalationActorDto } from '../use-cases/dto/alert-escalation-actor.dto';

const INCIDENT_CODE_PREFIX = 'MON-ALERT';
const INCIDENT_CODE_HASH_LENGTH = 32;
const MAX_METADATA_MAP_ENTRIES = 100;
const MAX_METADATA_KEY_LENGTH = 128;
const MAX_METADATA_VALUE_LENGTH = 2048;

export interface BuildAlertIncidentMetadataInput {
  alert: AlertCurrentState;
  incidentSeverity: AlertIncidentSeverity;
  actor: AlertEscalationActorDto;
  requestedAt: string;
  operatorNote?: string | null;
}

export interface AlertIncidentMetadata {
  schemaVersion: 'monitoring.alert.incident.v1';
  source: 'monitoring_alert';
  fingerprint: string;
  alertName: string;
  scopeType: AlertCurrentState['scopeType'];
  nodeId?: string;
  rackId?: string;
  workloadId?: string;
  serviceId?: string;
  monitoringSeverity: AlertCurrentStateSeverity;
  incidentSeverity: AlertIncidentSeverity;
  category: string;
  environment: string;
  team: string;
  metricKey: string | null;
  currentValue: string | null;
  threshold: string | null;
  observedWindow: string | null;
  dashboardUrl: string | null;
  runbookUrl: string | null;
  startsAt: string;
  lastReceivedAt: string;
  rawLabels: Record<string, string>;
  rawAnnotations: Record<string, string>;
  requestedAt: string;
  requestSessionId: string;
  operatorNote?: string;
}

export function buildIncidentCodeFromAlertFingerprint(
  fingerprint: string,
): string {
  const hash = createHash('sha256')
    .update(fingerprint, 'utf8')
    .digest('hex')
    .slice(0, INCIDENT_CODE_HASH_LENGTH)
    .toUpperCase();

  return `${INCIDENT_CODE_PREFIX}-${hash}`;
}

export function mapAlertSeverityToIncidentSeverity(
  severity: AlertCurrentStateSeverity,
): AlertIncidentSeverity {
  switch (severity) {
    case 'critical':
      return 'CRITICAL';
    case 'warning':
      return 'HIGH';
  }
}

export function buildAlertIncidentMetadata(
  input: BuildAlertIncidentMetadataInput,
): AlertIncidentMetadata {
  const { alert, incidentSeverity } = input;
  const operatorNote = normalizeMetadataString(input.operatorNote);

  return {
    schemaVersion: 'monitoring.alert.incident.v1',
    source: 'monitoring_alert',
    fingerprint: alert.fingerprint,
    alertName: alert.alertName,
    scopeType: alert.scopeType,
    ...mapScopeIdentity(alert),
    monitoringSeverity: alert.severity,
    incidentSeverity,
    category: alert.category,
    environment: alert.environment,
    team: alert.team,
    metricKey: alert.metricKey,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    observedWindow: alert.observedWindow,
    dashboardUrl: alert.dashboardUrl,
    runbookUrl: alert.runbookUrl,
    startsAt: alert.startsAt,
    lastReceivedAt: alert.lastReceivedAt,
    rawLabels: sanitizeMetadataMap(alert.rawLabels),
    rawAnnotations: sanitizeMetadataMap(alert.rawAnnotations),
    requestedAt: input.requestedAt,
    requestSessionId: input.actor.sessionId,
    ...(operatorNote ? { operatorNote } : {}),
  };
}

function mapScopeIdentity(
  alert: AlertCurrentState,
): Pick<
  AlertIncidentMetadata,
  'nodeId' | 'rackId' | 'workloadId' | 'serviceId'
> {
  switch (alert.scopeType) {
    case 'node':
      return {
        nodeId: alert.nodeId,
        rackId: alert.rackId,
      };
    case 'rack':
      return {
        rackId: alert.rackId,
      };
    case 'workload':
      return {
        workloadId: alert.workloadId,
        nodeId: alert.nodeId,
        rackId: alert.rackId,
      };
    case 'service':
      return {
        serviceId: alert.serviceId,
      };
  }
}

function sanitizeMetadataMap(
  input: Record<string, string>,
): Record<string, string> {
  return Object.entries(input)
    .slice(0, MAX_METADATA_MAP_ENTRIES)
    .reduce<Record<string, string>>((result, [key, value]) => {
      const normalizedKey = normalizeMetadataString(key);
      const normalizedValue = normalizeMetadataString(value);

      if (!normalizedKey || normalizedValue === null) {
        return result;
      }

      result[normalizedKey.slice(0, MAX_METADATA_KEY_LENGTH)] =
        normalizedValue.slice(0, MAX_METADATA_VALUE_LENGTH);
      return result;
    }, {});
}

function normalizeMetadataString(
  input: string | null | undefined,
): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const normalized = input.trim();
  return normalized ? normalized : null;
}
