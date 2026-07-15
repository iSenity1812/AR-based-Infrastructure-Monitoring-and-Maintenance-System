import { describe, expect, it } from '@jest/globals';

import {
  mapExternalAlertSyncRequestToCommand,
  mapExternalAlertToCurrentState,
  normalizeExternalAlertString,
  sanitizeExternalAlertMap,
} from './external-alert-sync.mapper';

describe('external alert sync mapper', () => {
  it('sanitizes unknown maps into string maps', () => {
    expect(
      sanitizeExternalAlertMap({
        a: 'value',
        b: 1,
        c: true,
        d: null,
        e: { nested: true },
      }),
    ).toEqual({
      a: 'value',
      b: '1',
      c: 'true',
    });
  });

  it('normalizes null-like strings', () => {
    expect(normalizeExternalAlertString(' null ')).toBeNull();
    expect(normalizeExternalAlertString('   ')).toBeNull();
    expect(normalizeExternalAlertString('rack-a1')).toBe('rack-a1');
  });

  it('maps request DTO into sanitized command', () => {
    const command = mapExternalAlertSyncRequestToCommand(
      {
        receiver: 'monitoring-rack-lab',
        status: 'firing',
        alerts: [
          {
            status: 'firing',
            labels: {
              alertname: 'RackSignalLossPresent',
              scope_type: 'rack',
              rack_id: ' rack-a1 ',
              severity: 'critical',
            },
            annotations: {
              summary: 'Signal loss',
              current_value: 1,
            },
            startsAt: '2026-07-14T13:12:50Z',
            endsAt: null,
            generatorURL: 'http://localhost:3010/rule',
            fingerprint: 'fp-1',
          },
        ],
        commonLabels: {
          source: 'grafana',
        },
        commonAnnotations: {
          observed_window: 'current-snapshot',
        },
      },
      '2026-07-15T01:00:00.000Z',
    );

    expect(command.commonLabels).toEqual({ source: 'grafana' });
    expect(command.alerts[0]).toEqual(
      expect.objectContaining({
        fingerprint: 'fp-1',
        generatorUrl: 'http://localhost:3010/rule',
        labels: expect.objectContaining({
          rack_id: ' rack-a1 ',
        }),
        rawAnnotations: expect.objectContaining({
          current_value: '1',
        }),
      }),
    );
  });

  it('maps a valid rack alert and preserves raw metadata', () => {
    const result = mapExternalAlertToCurrentState({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {
        observed_window: 'current-snapshot',
      },
      alert: {
        fingerprint: 'fp-1',
        status: 'resolved',
        startsAt: '2026-07-14T13:12:50Z',
        endsAt: '2026-07-14T13:14:50Z',
        generatorUrl: 'http://localhost:3010/rule',
        labels: {
          alertname: 'RackSignalLossPresent',
          scope_type: 'rack',
          rack_id: 'rack-a1',
          severity: 'critical',
        },
        annotations: {
          summary: 'Rack signal loss',
          description: 'Signal loss detected',
          current_value: '1',
        },
        rawLabels: {
          alertname: 'RackSignalLossPresent',
          scope_type: 'rack',
          rack_id: 'rack-a1',
          severity: 'critical',
        },
        rawAnnotations: {
          summary: 'Rack signal loss',
          description: 'Signal loss detected',
          current_value: '1',
        },
      },
    });

    expect(result.kind).toBe('mapped');
    if (result.kind !== 'mapped') {
      return;
    }

    expect(result.state).toEqual(
      expect.objectContaining({
        scopeType: 'rack',
        rackId: 'rack-a1',
        status: 'resolved',
        rawLabels: expect.objectContaining({
          rack_id: 'rack-a1',
          source: 'grafana',
        }),
        rawAnnotations: expect.objectContaining({
          summary: 'Rack signal loss',
          observed_window: 'current-snapshot',
        }),
      }),
    );
  });

  it('marks required identity missing after normalization as invalid', () => {
    const result = mapExternalAlertToCurrentState({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {},
      alert: {
        fingerprint: 'fp-2',
        status: 'firing',
        startsAt: '2026-07-14T13:12:50Z',
        endsAt: null,
        generatorUrl: null,
        labels: {
          alertname: 'RackSignalLossPresent',
          scope_type: 'rack',
          rack_id: 'null',
          severity: 'critical',
        },
        annotations: {
          summary: 'Rack signal loss',
        },
        rawLabels: {
          alertname: 'RackSignalLossPresent',
          scope_type: 'rack',
          rack_id: 'null',
          severity: 'critical',
        },
        rawAnnotations: {
          summary: 'Rack signal loss',
        },
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'invalid',
        reason: 'missing_required_identity',
      }),
    );
  });
});
