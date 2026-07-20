import { describe, expect, it } from '@jest/globals';

import {
  buildSummaryRuleFingerprint,
  createContainerSummaryRuleInput,
  createNodeSummaryRuleInput,
  createRackSummaryRuleInput,
  createServiceSummaryRuleInput,
  evaluateSummaryRuleInput,
} from './summary-rule';

describe('summary-rule domain', () => {
  it('creates a rack summary input without raw telemetry dependencies', () => {
    const input = createRackSummaryRuleInput({
      rackId: 'rack-a1',
      observedAt: '2026-07-07 10:00:00',
      severityCode: 3,
      overrideFlag: true,
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
          badNodeRatio: 0.5417,
        },
        booleanIndicators: {
          isRackLevelFailure: true,
          hasSignalLoss: true,
        },
      },
    });

    expect(input).toMatchObject({
      summarySource: 'rack_current_summary',
      scopeType: 'rack',
      scopeId: 'rack-a1',
      severityCode: 3,
      overrideFlag: true,
    });
    expect(input.evidence.numericIndicators).not.toHaveProperty(
      'metricSeriesValues',
    );
  });

  it('creates scope-specific summary inputs for service, node, and container', () => {
    const serviceInput = createServiceSummaryRuleInput({
      serviceId: 'svc-auth',
      observedAt: '2026-07-07 10:01:00',
      severityCode: 2,
    });
    const nodeInput = createNodeSummaryRuleInput({
      nodeId: 'node-01',
      observedAt: '2026-07-07 10:02:00',
      severityCode: 1,
    });
    const containerInput = createContainerSummaryRuleInput({
      containerId: 'ctr-nginx-1',
      observedAt: '2026-07-07 10:03:00',
      severityCode: 0,
    });

    expect(serviceInput.summarySource).toBe('service_current_summary');
    expect(nodeInput.summarySource).toBe('node_current_summary');
    expect(containerInput.summarySource).toBe('container_current_summary');
  });

  it('builds a stable summary fingerprint from summary semantics only', () => {
    const input = createRackSummaryRuleInput({
      rackId: 'rack-a1',
      observedAt: '2026-07-07 10:04:00',
      severityCode: 2,
      culprit: {
        entityId: 'node-04',
        metricKey: 'memory_usage_pct',
      },
    });

    expect(buildSummaryRuleFingerprint(input)).toBe(
      'rack:rack-a1|source:rack_current_summary|severity:2|override:0|culprit:node-04|metric:memory_usage_pct',
    );
  });

  it('evaluates summary input into candidate monitoring state and intent', () => {
    const activeEvaluation = evaluateSummaryRuleInput(
      createServiceSummaryRuleInput({
        serviceId: 'svc-auth',
        observedAt: '2026-07-07 10:05:00',
        severityCode: 3,
        overrideFlag: true,
        culprit: {
          entityId: 'ctr-auth-1',
          metricKey: 'container.health_status',
          metricValueText: 'unhealthy',
        },
      }),
    );
    const resolvedEvaluation = evaluateSummaryRuleInput(
      createContainerSummaryRuleInput({
        containerId: 'ctr-auth-1',
        observedAt: '2026-07-07 10:06:00',
        severityCode: 0,
      }),
    );

    expect(activeEvaluation).toMatchObject({
      scopeType: 'service',
      scopeId: 'svc-auth',
      candidateIntent: 'activate',
      lifecycleStatus: 'active',
    });
    expect(activeEvaluation.candidateState).toMatchObject({
      scopeType: 'service',
      scopeId: 'svc-auth',
      lifecycleStatus: 'active',
      notificationSyncStatus: 'pending_open',
    });
    expect(resolvedEvaluation).toMatchObject({
      scopeType: 'container',
      scopeId: 'ctr-auth-1',
      candidateIntent: 'resolve',
      lifecycleStatus: 'resolved',
    });
  });
});
