import { describe, expect, it } from '@jest/globals';

import {
  buildAlertIncidentMetadata,
  buildIncidentCodeFromAlertFingerprint,
  mapAlertSeverityToIncidentSeverity,
} from './alert-incident-handoff.mapper';
import {
  createDefaultAlertIncidentLinkage,
  type AlertCurrentState,
} from '../../domain/alert-current-state';

describe('alert incident handoff mapper', () => {
  it('maps monitoring warning alerts to high incident severity', () => {
    expect(mapAlertSeverityToIncidentSeverity('warning')).toBe('HIGH');
    expect(mapAlertSeverityToIncidentSeverity('critical')).toBe('CRITICAL');
  });

  it('builds deterministic collision-resistant incident codes from full fingerprints', () => {
    const first = buildIncidentCodeFromAlertFingerprint(
      'same-prefix-but-different-a',
    );
    const second = buildIncidentCodeFromAlertFingerprint(
      'same-prefix-but-different-b',
    );

    expect(first).toMatch(/^MON-ALERT-[A-F0-9]{32}$/);
    expect(first).toBe(
      buildIncidentCodeFromAlertFingerprint('same-prefix-but-different-a'),
    );
    expect(first).not.toBe(second);
  });

  it('builds metadata with scope identity and preserved raw alert context', () => {
    const alert = buildNodeAlert({
      rawLabels: {
        alertname: 'NodeCpuTempCritical',
        node_id: 'node-a1',
        noisy: '  keep me  ',
      },
      rawAnnotations: {
        summary: 'Hot node',
        description: 'CPU temp exceeded threshold',
      },
    });

    expect(
      buildAlertIncidentMetadata({
        alert,
        incidentSeverity: 'CRITICAL',
        actor: {
          userId: 'user-1',
          username: 'ducpv',
          sessionId: 'session-1',
          fullName: 'Pham Van Duc',
        },
        requestedAt: '2026-07-22T10:00:00.000Z',
        operatorNote: ' Check cooling path ',
      }),
    ).toEqual(
      expect.objectContaining({
        schemaVersion: 'monitoring.alert.incident.v1',
        source: 'monitoring_alert',
        fingerprint: 'fp-node-a1',
        alertName: 'NodeCpuTempCritical',
        scopeType: 'node',
        nodeId: 'node-a1',
        rackId: 'rack-a1',
        monitoringSeverity: 'critical',
        incidentSeverity: 'CRITICAL',
        rawLabels: expect.objectContaining({
          noisy: 'keep me',
        }),
        rawAnnotations: expect.objectContaining({
          description: 'CPU temp exceeded threshold',
        }),
        requestedAt: '2026-07-22T10:00:00.000Z',
        requestSessionId: 'session-1',
        operatorNote: 'Check cooling path',
      }),
    );
  });
});

function buildNodeAlert(
  override: Partial<AlertCurrentState> = {},
): AlertCurrentState {
  return {
    fingerprint: 'fp-node-a1',
    alertName: 'NodeCpuTempCritical',
    rawLabels: {},
    rawAnnotations: {},
    severity: 'critical',
    status: 'firing',
    category: 'thermal',
    environment: 'lab',
    team: 'platform',
    source: 'grafana',
    summary: 'Node node-a1 CPU temperature 94C > 90C',
    description: 'Node node-a1 is too hot',
    metricKey: 'cpu_temp_celsius',
    observedWindow: '5m',
    dashboardUrl: '/d/monitoring-overview',
    runbookUrl: '/docs/runbooks/alerting/node-cpu-temp-critical',
    currentValue: '94',
    threshold: '90',
    startsAt: '2026-07-15T20:01:30Z',
    endsAt: null,
    lastReceivedAt: '2026-07-15T20:01:45.000Z',
    firstSyncedAt: '2026-07-15T20:01:45.000Z',
    lastSyncedAt: '2026-07-15T20:01:45.000Z',
    lastStatusChangedAt: '2026-07-15T20:01:45.000Z',
    scopeType: 'node',
    nodeId: 'node-a1',
    rackId: 'rack-a1',
    ...createDefaultAlertIncidentLinkage(),
    ...override,
  };
}
