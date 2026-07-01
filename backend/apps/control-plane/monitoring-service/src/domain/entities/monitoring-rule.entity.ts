import { AlertSeverity } from '../constants/alert-severity.enum';
import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';
import { RuleEvaluationMode } from '../constants/rule-evaluation-mode.enum';
import { RuleOperator } from '../constants/rule-operator.enum';

export interface MonitoringRuleProps {
  id: string;
  name: string;
  description?: string;
  scopeType: MonitoringScopeType;
  metricKey: string;
  contextMetricKey?: string;
  operator: RuleOperator;
  thresholdValue?: number | string | boolean;
  severity: AlertSeverity;
  enabled: boolean;
  evaluationMode: RuleEvaluationMode;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MonitoringRule {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly scopeType: MonitoringScopeType;
  readonly metricKey: string;
  readonly contextMetricKey?: string;
  readonly operator: RuleOperator;
  readonly thresholdValue?: number | string | boolean;
  readonly severity: AlertSeverity;
  readonly enabled: boolean;
  readonly evaluationMode: RuleEvaluationMode;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: MonitoringRuleProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.scopeType = props.scopeType;
    this.metricKey = props.metricKey;
    this.contextMetricKey = props.contextMetricKey;
    this.operator = props.operator;
    this.thresholdValue = props.thresholdValue;
    this.severity = props.severity;
    this.enabled = props.enabled;
    this.evaluationMode = props.evaluationMode;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isActive(): boolean {
    return this.enabled;
  }

  disable(): MonitoringRule {
    return new MonitoringRule({
      ...this,
      enabled: false,
      updatedAt: new Date(),
    });
  }

  enable(): MonitoringRule {
    return new MonitoringRule({
      ...this,
      enabled: true,
      updatedAt: new Date(),
    });
  }
}
