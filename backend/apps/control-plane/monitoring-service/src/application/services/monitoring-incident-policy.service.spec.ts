import { describe, expect, it } from '@jest/globals';

import type { AlertCurrentState } from '../../domain/alert-current-state';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import { MonitoringIncidentPolicyService } from './monitoring-incident-policy.service';

describe('MonitoringIncidentPolicyService', () => {
  const config = new MonitoringServiceConfig({
    MONITORING_INCIDENT_NODE_STALE_THRESHOLD_SEC: '1800',
  });

  const service = new MonitoringIncidentPolicyService(config);

  it('classifies rack critical alerts into incident and ticket', () => {
    const decision = service.classify(
      buildAlert({ alertName: 'RackCritical' }),
    );

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'incident_and_ticket',
        shouldCreateIncident: true,
        shouldCreateTicket: true,
        incidentSeverity: 'CRITICAL',
        ticketPriority: 'CRITICAL',
      }),
    );
  });

  it('classifies critical memory pressure alerts into incident and ticket', () => {
    const decision = service.classify(
      buildAlert({
        alertName: 'NodeMemoryPressureCritical',
        currentValue: '91',
        severity: 'critical',
      }),
    );

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'incident_and_ticket',
        shouldCreateIncident: true,
        shouldCreateTicket: true,
        incidentSeverity: 'CRITICAL',
        ticketPriority: 'CRITICAL',
      }),
    );
  });

  it('classifies warning memory pressure alerts into incident only', () => {
    const decision = service.classify(
      buildAlert({
        alertName: 'NodeMemoryPressureHigh',
        currentValue: '86',
        severity: 'warning',
      }),
    );

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'incident_only',
        shouldCreateIncident: true,
        shouldCreateTicket: false,
        incidentSeverity: 'HIGH',
        ticketPriority: null,
      }),
    );
  });

  it('keeps noisy container restart alerts as alert only', () => {
    const decision = service.classify(
      buildAlert({ alertName: 'ContainerRestarting', severity: 'warning' }),
    );

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'alert_only',
        shouldCreateIncident: false,
        shouldCreateTicket: false,
        incidentSeverity: null,
      }),
    );
  });

  it('escalates prolonged NodeStale alerts into incidents', () => {
    const decision = service.classify(
      buildAlert({
        alertName: 'NodeStale',
        currentValue: '14543',
        severity: 'warning',
      }),
    );

    expect(decision.action).toBe('incident_only');
    expect(decision.shouldCreateIncident).toBe(true);
  });

  it('keeps short NodeStale alerts as alert only', () => {
    const decision = service.classify(
      buildAlert({
        alertName: 'NodeStale',
        currentValue: '120',
        severity: 'warning',
      }),
    );

    expect(decision).toEqual(
      expect.objectContaining({
        action: 'alert_only',
        shouldCreateIncident: false,
        shouldCreateTicket: false,
      }),
    );
  });
});

function buildAlert(
  overrides: Partial<AlertCurrentState> & Pick<AlertCurrentState, 'alertName'>,
): AlertCurrentState {
  return {
    fingerprint: 'fp-1',
    alertName: overrides.alertName,
    rawLabels: {},
    rawAnnotations: {},
    scopeType: 'node',
    nodeId: 'node-1',
    rackId: 'rack-1',
    severity: 'critical',
    status: 'firing',
    category: 'availability',
    environment: 'lab',
    team: 'infra',
    source: 'grafana',
    summary: 'summary',
    description: 'description',
    metricKey: null,
    observedWindow: null,
    dashboardUrl: null,
    runbookUrl: null,
    currentValue: null,
    threshold: null,
    startsAt: '2026-07-22T00:00:00.000Z',
    endsAt: null,
    lastReceivedAt: '2026-07-22T00:05:00.000Z',
    firstSyncedAt: '2026-07-22T00:05:00.000Z',
    lastSyncedAt: '2026-07-22T00:05:00.000Z',
    lastStatusChangedAt: '2026-07-22T00:05:00.000Z',
    triageStatus: 'new',
    incidentId: null,
    incidentCode: null,
    incidentStatus: null,
    incidentSeverity: null,
    incidentTitle: null,
    incidentCreatedAt: null,
    incidentLinkedAt: null,
    lastEscalatedAt: null,
    ...overrides,
  };
}
