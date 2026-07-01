import { AlertSeverity } from '../constants/alert-severity.enum';
import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';
import { RuleEvaluationMode } from '../constants/rule-evaluation-mode.enum';
import { RuleOperator } from '../constants/rule-operator.enum';
import { MonitoringInputField } from '../entities/monitoring-input.entity';
import { MonitoringRule } from '../entities/monitoring-rule.entity';
import { RuleMatchService } from './rule-match.service';

describe('RuleMatchService', () => {
  const service = new RuleMatchService();
  const baseRule = {
    id: 'rule-1',
    name: 'rule',
    scopeType: MonitoringScopeType.NODE,
    metricKey: 'node.cpu_usage_pct',
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: new Date('2026-06-26T00:00:00Z'),
    updatedAt: new Date('2026-06-26T00:00:00Z'),
  };

  const field = (value: number | string | boolean | null): MonitoringInputField => ({
    metricKey: 'node.cpu_usage_pct',
    value,
    observedAt: new Date('2026-06-26T00:01:00Z'),
    unit: '%',
    source: 'snapshot',
  });

  it('honors inclusive and exclusive numeric boundaries', () => {
    const greaterThan = new MonitoringRule({
      ...baseRule,
      operator: RuleOperator.GREATER_THAN,
      thresholdValue: 90,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
    });
    const greaterThanOrEqual = new MonitoringRule({
      ...baseRule,
      operator: RuleOperator.GREATER_THAN_OR_EQUAL,
      thresholdValue: 90,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
    });

    expect(service.evaluate(greaterThan, field(90)).matched).toBe(false);
    expect(service.evaluate(greaterThanOrEqual, field(90)).matched).toBe(true);
  });

  it('evaluates state rules exactly', () => {
    const rule = new MonitoringRule({
      ...baseRule,
      metricKey: 'container.status',
      operator: RuleOperator.NOT_EQUAL,
      thresholdValue: 'running',
      evaluationMode: RuleEvaluationMode.STATE,
    });

    expect(
      service.evaluate(rule, {
        metricKey: 'container.status',
        value: 'exited',
        observedAt: new Date('2026-06-26T00:01:00Z'),
      }).matched,
    ).toBe(true);
    expect(
      service.evaluate(rule, {
        metricKey: 'container.status',
        value: 'running',
        observedAt: new Date('2026-06-26T00:01:00Z'),
      }).matched,
    ).toBe(false);
  });

  it('evaluates capacity-relative rules against context values', () => {
    const rule = new MonitoringRule({
      ...baseRule,
      metricKey: 'service.running_container_count',
      contextMetricKey: 'service.container_count',
      operator: RuleOperator.LESS_THAN,
      evaluationMode: RuleEvaluationMode.CAPACITY_RELATIVE,
    });

    const result = service.evaluate(
      rule,
      {
        metricKey: 'service.running_container_count',
        value: 1,
        observedAt: new Date('2026-06-26T00:01:00Z'),
      },
      {
        metricKey: 'service.container_count',
        value: 2,
        observedAt: new Date('2026-06-26T00:01:00Z'),
      },
    );

    expect(result.matched).toBe(true);
    expect(result.comparableValue).toBe(2);
  });

  it('skips capacity-relative rules when context is missing', () => {
    const rule = new MonitoringRule({
      ...baseRule,
      metricKey: 'service.running_container_count',
      contextMetricKey: 'service.container_count',
      operator: RuleOperator.LESS_THAN,
      evaluationMode: RuleEvaluationMode.CAPACITY_RELATIVE,
    });

    const result = service.evaluate(rule, {
      metricKey: 'service.running_container_count',
      value: 1,
      observedAt: new Date('2026-06-26T00:01:00Z'),
    });

    expect(result.matched).toBe(false);
    expect(result.skipReason).toBe('missing_context');
  });
});
