import { AlertSeverity } from '../constants/alert-severity.enum';
import { HealthStatus } from '../constants/health-status.enum';
import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';
import { ScopeReference } from '../value-objects/scope-reference.vo';

export interface HealthSummaryProps {
  id?: string;
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  healthStatus: HealthStatus;
  highestSeverity?: AlertSeverity;
  openAlertCount: number;
  warningAlertCount: number;
  criticalAlertCount: number;
  updatedAt: Date;
}

export class HealthSummary {
  readonly id?: string;
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;
  readonly healthStatus: HealthStatus;
  readonly highestSeverity?: AlertSeverity;
  readonly openAlertCount: number;
  readonly warningAlertCount: number;
  readonly criticalAlertCount: number;
  readonly updatedAt: Date;

  constructor(props: HealthSummaryProps) {
    this.id = props.id;
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
    this.healthStatus = props.healthStatus;
    this.highestSeverity = props.highestSeverity;
    this.openAlertCount = props.openAlertCount;
    this.warningAlertCount = props.warningAlertCount;
    this.criticalAlertCount = props.criticalAlertCount;
    this.updatedAt = props.updatedAt;
  }

  get scope(): ScopeReference {
    return new ScopeReference({
      scopeType: this.scopeType,
      scopeId: this.scopeId,
      agentId: this.agentId,
    });
  }
}
