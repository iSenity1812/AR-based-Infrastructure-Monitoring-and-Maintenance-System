import { AlertOccurrence } from '../../../domain/entities/alert-occurrence.entity';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';
import {
  MonitoringContextInput,
  MonitoringSnapshotInput,
} from '../../../domain/entities/monitoring-input.entity';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';
import { MonitoringScopeType } from '../../../domain/constants/monitoring-scope-type.enum';

export interface AlertDetailView {
  alert: MonitoringAlert;
  occurrences: AlertOccurrence[];
}

export interface HealthOverviewItem {
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  healthSummary?: HealthSummary;
  context?: MonitoringContextInput;
  snapshot?: MonitoringSnapshotInput;
}
