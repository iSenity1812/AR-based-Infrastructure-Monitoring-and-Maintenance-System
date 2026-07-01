import {
  MonitoringContextInput,
  MonitoringInputField,
  MonitoringSnapshotInput,
} from '../../../domain/entities/monitoring-input.entity';
import { MonitoringRule } from '../../../domain/entities/monitoring-rule.entity';

export class CurrentStateEvaluationFrame {
  constructor(
    readonly snapshot: MonitoringSnapshotInput,
    readonly context?: MonitoringContextInput | null,
  ) {}

  get scopeType() {
    return this.snapshot.scopeType;
  }

  get scopeId() {
    return this.snapshot.scopeId;
  }

  get agentId() {
    return this.snapshot.agentId;
  }

  get updatedAt() {
    return this.snapshot.updatedAt;
  }

  getObservedField(rule: MonitoringRule): MonitoringInputField | undefined {
    return this.snapshot.findField(rule.metricKey);
  }

  getContextField(rule: MonitoringRule): MonitoringInputField | undefined {
    if (!rule.contextMetricKey) {
      return undefined;
    }

    return this.context?.findField(rule.contextMetricKey);
  }
}
