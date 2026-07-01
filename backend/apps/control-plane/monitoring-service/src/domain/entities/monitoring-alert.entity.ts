import { AlertSeverity } from '../constants/alert-severity.enum';
import { AlertStatus } from '../constants/alert-status.enum';
import { MonitoringScopeType } from '../constants/monitoring-scope-type.enum';
import { ScopeReference } from '../value-objects/scope-reference.vo';

export interface MonitoringAlertProps {
  id: string;
  fingerprint: string;
  ruleId: string;
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  metricKey: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  summary: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MonitoringAlert {
  readonly id: string;
  readonly fingerprint: string;
  readonly ruleId: string;
  readonly scopeType: MonitoringScopeType;
  readonly scopeId: string;
  readonly agentId?: string;
  readonly metricKey: string;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly title: string;
  readonly summary: string;
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
  readonly acknowledgedAt?: Date;
  readonly resolvedAt?: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: MonitoringAlertProps) {
    this.id = props.id;
    this.fingerprint = props.fingerprint;
    this.ruleId = props.ruleId;
    this.scopeType = props.scopeType;
    this.scopeId = props.scopeId;
    this.agentId = props.agentId;
    this.metricKey = props.metricKey;
    this.severity = props.severity;
    this.status = props.status;
    this.title = props.title;
    this.summary = props.summary;
    this.firstSeenAt = props.firstSeenAt;
    this.lastSeenAt = props.lastSeenAt;
    this.acknowledgedAt = props.acknowledgedAt;
    this.resolvedAt = props.resolvedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get scope(): ScopeReference {
    return new ScopeReference({
      scopeType: this.scopeType,
      scopeId: this.scopeId,
      agentId: this.agentId,
    });
  }

  isOpen(): boolean {
    return this.status === AlertStatus.OPEN;
  }

  acknowledge(at: Date): MonitoringAlert {
    return new MonitoringAlert({
      ...this,
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: at,
      updatedAt: at,
    });
  }

  refreshSeen(at: Date): MonitoringAlert {
    return new MonitoringAlert({
      ...this,
      lastSeenAt: at,
      updatedAt: at,
    });
  }

  refreshObservation(at: Date, summary?: string): MonitoringAlert {
    return new MonitoringAlert({
      ...this,
      lastSeenAt: at,
      summary: summary ?? this.summary,
      updatedAt: at,
    });
  }

  resolve(at: Date): MonitoringAlert {
    return new MonitoringAlert({
      ...this,
      status: AlertStatus.RESOLVED,
      resolvedAt: at,
      lastSeenAt: at,
      updatedAt: at,
    });
  }
}
