import type {
  AlertOccurrence,
  AlertOccurrenceProps,
} from '../entities/alert-occurrence.entity';
import type {
  HealthSummary,
  HealthSummaryProps,
} from '../entities/health-summary.entity';
import type {
  MonitoringAlert,
  MonitoringAlertProps,
} from '../entities/monitoring-alert.entity';
import type {
  MonitoringContextInput,
  MonitoringContextInputProps,
  MonitoringSnapshotInput,
  MonitoringSnapshotInputProps,
} from '../entities/monitoring-input.entity';
import type {
  MonitoringRule,
  MonitoringRuleProps,
} from '../entities/monitoring-rule.entity';

export interface MonitoringRuleRepositoryPort {
  create(input: MonitoringRuleProps): Promise<MonitoringRule>;
  update(
    id: string,
    input: Partial<MonitoringRuleProps>,
  ): Promise<MonitoringRule | null>;
  findById(id: string): Promise<MonitoringRule | null>;
  listAll(): Promise<MonitoringRule[]>;
  listEnabled(): Promise<MonitoringRule[]>;
}

export interface AlertRepositoryPort {
  create(input: MonitoringAlertProps): Promise<MonitoringAlert>;
  update(
    id: string,
    input: Partial<MonitoringAlertProps>,
  ): Promise<MonitoringAlert | null>;
  findById(id: string): Promise<MonitoringAlert | null>;
  findByFingerprint(fingerprint: string): Promise<MonitoringAlert | null>;
  listOpen(): Promise<MonitoringAlert[]>;
  listByScope(scopeType: string, scopeId: string): Promise<MonitoringAlert[]>;
}

export interface AlertOccurrenceRepositoryPort {
  create(input: AlertOccurrenceProps): Promise<AlertOccurrence>;
  listByAlertId(alertId: string): Promise<AlertOccurrence[]>;
}

export interface HealthSummaryRepositoryPort {
  upsert(input: HealthSummaryProps): Promise<HealthSummary>;
  findByScope(
    scopeType: string,
    scopeId: string,
  ): Promise<HealthSummary | null>;
  listByScopeType(scopeType: string): Promise<HealthSummary[]>;
}

export interface MonitoringContextRepositoryPort {
  upsert(input: MonitoringContextInputProps): Promise<MonitoringContextInput>;
  findByScope(
    scopeType: string,
    scopeId: string,
  ): Promise<MonitoringContextInput | null>;
  listByScopeType(scopeType: string): Promise<MonitoringContextInput[]>;
}

export interface MonitoringSnapshotRepositoryPort {
  upsert(input: MonitoringSnapshotInputProps): Promise<MonitoringSnapshotInput>;
  findByScope(
    scopeType: string,
    scopeId: string,
  ): Promise<MonitoringSnapshotInput | null>;
  listByScopeType(scopeType: string): Promise<MonitoringSnapshotInput[]>;
}
