import { describe, expect, it } from '@jest/globals';

import { mapCommandToAlertmanagerPayload } from './alertmanager-http.adapter';

describe('alertmanager payload mapper', () => {
  it('maps alert delivery command into stable labels and operator-facing annotations', () => {
    const payload = mapCommandToAlertmanagerPayload({
      transitionKind: 'activate',
      summarySource: 'rack_current_summary',
      scopeType: 'rack',
      scopeId: 'rack-a1',
      scopeKey: 'rack:rack-a1',
      observedAt: '2026-07-08T09:00:00.000Z',
      startsAt: '2026-07-08T09:00:00.000Z',
      endsAt: null,
      severityCode: 3,
      overrideFlag: true,
      lifecycleStatus: 'active',
      fingerprint: 'rack:rack-a1|severity:3',
      culprit: {
        entityId: 'node-17',
        metricKey: 'cpu_usage_pct',
        metricTagsJson: '{"host":"node-17"}',
        metricValueNumeric: 98.4,
        metricValueText: '98.4',
      },
      evidence: {
        numericIndicators: {
          totalNodes: 24,
          badNodes: 13,
          criticalNodes: 5,
          warningNodes: 8,
          staleNodes: 2,
          silentDeadNodes: 1,
          badNodeRatio: 0.5417,
        },
        booleanIndicators: {
          isRackLevelFailure: true,
          hasSignalLoss: true,
        },
        textIndicators: {},
      },
    });

    expect(payload.labels).toMatchObject({
      alertname: 'RackHealthAlert',
      scope_key: 'rack:rack-a1',
      severity_code: '3',
    });
    expect(payload.annotations).toMatchObject({
      culprit_entity_id: 'node-17',
      culprit_metric_key: 'cpu_usage_pct',
      bad_nodes: '13',
      total_nodes: '24',
      is_rack_level_failure: 'true',
      has_signal_loss: 'true',
    });
  });
});
