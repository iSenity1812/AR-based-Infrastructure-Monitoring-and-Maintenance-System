import { Injectable } from '@nestjs/common';

import type {
  AlertCurrentState,
  AlertIncidentSeverity,
} from '../../domain/alert-current-state';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

export type MonitoringIncidentPolicyAction =
  | 'alert_only'
  | 'incident_only'
  | 'incident_and_ticket';

export interface MonitoringIncidentPolicyDecision {
  action: MonitoringIncidentPolicyAction;
  shouldCreateIncident: boolean;
  shouldCreateTicket: boolean;
  incidentSeverity: AlertIncidentSeverity | null;
  ticketPriority: 'CRITICAL' | null;
  reason: string;
}

const ALERT_ONLY_RULES = new Set([
  'ContainerRestarting',
  'ContainerUnhealthyPerContainer',
  'ContainerUnhealthyPresent',
  'NodeDiskUsageHigh',
  'NodePacketLossHigh',
]);

const INCIDENT_ONLY_RULES = new Set([
  'RackDegraded',
  'NodeMemoryPressureHigh',
  'NodeCpuUsageHigh',
  'ServicePartialOutage',
]);

const INCIDENT_AND_TICKET_RULES = new Set([
  'RackSignalLossPresent',
  'RackCritical',
  'NodeCpuTempCritical',
]);

@Injectable()
export class MonitoringIncidentPolicyService {
  constructor(private readonly config: MonitoringServiceConfig) {}

  classify(alert: AlertCurrentState): MonitoringIncidentPolicyDecision {
    if (INCIDENT_AND_TICKET_RULES.has(alert.alertName)) {
      return {
        action: 'incident_and_ticket',
        shouldCreateIncident: true,
        shouldCreateTicket: true,
        incidentSeverity: 'CRITICAL',
        ticketPriority: 'CRITICAL',
        reason: `${alert.alertName} is in the auto-ticket allowlist.`,
      };
    }

    if (INCIDENT_ONLY_RULES.has(alert.alertName)) {
      return {
        action: 'incident_only',
        shouldCreateIncident: true,
        shouldCreateTicket: false,
        incidentSeverity: mapSeverity(alert),
        ticketPriority: null,
        reason: `${alert.alertName} should create an operator-visible incident.`,
      };
    }

    if (alert.alertName === 'NodeStale') {
      const staleAgeSec = parseNodeStaleAgeSec(alert);
      if (
        staleAgeSec !== null &&
        staleAgeSec >= this.config.monitoringIncidentNodeStaleThresholdSec
      ) {
        return {
          action: 'incident_only',
          shouldCreateIncident: true,
          shouldCreateTicket: false,
          incidentSeverity: 'HIGH',
          ticketPriority: null,
          reason: `NodeStale crossed the incident threshold of ${this.config.monitoringIncidentNodeStaleThresholdSec}s.`,
        };
      }

      return {
        action: 'alert_only',
        shouldCreateIncident: false,
        shouldCreateTicket: false,
        incidentSeverity: null,
        ticketPriority: null,
        reason: `NodeStale stays alert-only until stale age reaches ${this.config.monitoringIncidentNodeStaleThresholdSec}s.`,
      };
    }

    if (ALERT_ONLY_RULES.has(alert.alertName)) {
      return {
        action: 'alert_only',
        shouldCreateIncident: false,
        shouldCreateTicket: false,
        incidentSeverity: null,
        ticketPriority: null,
        reason: `${alert.alertName} is intentionally kept as an alert only in v1.`,
      };
    }

    return {
      action: 'alert_only',
      shouldCreateIncident: false,
      shouldCreateTicket: false,
      incidentSeverity: null,
      ticketPriority: null,
      reason: `${alert.alertName} is not allowlisted for automatic workflow actions.`,
    };
  }
}

function mapSeverity(alert: AlertCurrentState): AlertIncidentSeverity {
  return alert.severity === 'critical' ? 'CRITICAL' : 'HIGH';
}

function parseNodeStaleAgeSec(alert: AlertCurrentState): number | null {
  const candidates = [
    alert.currentValue,
    alert.rawAnnotations.current_value,
    alert.rawLabels.current_value,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}
