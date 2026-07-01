import { AlertSeverity } from '../constants/alert-severity.enum';
import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';

export interface AlertOccurrenceProps {
  id: string;
  alertId: string;
  ruleId: string;
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  metricKey: string;
  observedValue: number | string | boolean | null;
  thresholdValue?: number | string | boolean;
  severity: AlertSeverity;
  observedAt: Date;
  batchSequence?: number;
  createdAt?: Date;
}

export class AlertOccurrence {
  readonly id: string;
  readonly alertId: string;
  readonly ruleId: string;
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;
  readonly metricKey: string;
  readonly observedValue: number | string | boolean | null;
  readonly thresholdValue?: number | string | boolean;
  readonly severity: AlertSeverity;
  readonly observedAt: Date;
  readonly batchSequence?: number;
  readonly createdAt?: Date;

  constructor(props: AlertOccurrenceProps) {
    this.id = props.id;
    this.alertId = props.alertId;
    this.ruleId = props.ruleId;
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
    this.metricKey = props.metricKey;
    this.observedValue = props.observedValue;
    this.thresholdValue = props.thresholdValue;
    this.severity = props.severity;
    this.observedAt = props.observedAt;
    this.batchSequence = props.batchSequence;
    this.createdAt = props.createdAt;
  }
}
