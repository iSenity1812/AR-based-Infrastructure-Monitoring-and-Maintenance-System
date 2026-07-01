import {
  MonitoringContextInput,
  MonitoringContextInputProps,
  MonitoringSnapshotInput,
  MonitoringSnapshotInputProps,
} from '../../../domain/entities/monitoring-input.entity';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';

export interface IngestMonitoringContextPort {
  execute(input: MonitoringContextInputProps): Promise<MonitoringContextInput>;
}

export interface SnapshotIngestResult {
  snapshot: MonitoringSnapshotInput;
  evaluatedRuleCount: number;
  matchedRuleCount: number;
  openedAlertCount: number;
  refreshedAlertCount: number;
  resolvedAlertCount: number;
  healthSummary: HealthSummary;
}

export interface IngestMonitoringSnapshotPort {
  execute(input: MonitoringSnapshotInputProps): Promise<SnapshotIngestResult>;
}
