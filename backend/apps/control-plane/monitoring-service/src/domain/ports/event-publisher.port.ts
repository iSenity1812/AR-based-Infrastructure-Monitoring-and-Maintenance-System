import type { HealthSummary } from '../entities/health-summary.entity';
import type { MonitoringAlert } from '../entities/monitoring-alert.entity';

export interface MonitoringEventPublisherPort {
  publishAlertOpened(alert: MonitoringAlert): Promise<void>;
  publishAlertUpdated(alert: MonitoringAlert): Promise<void>;
  publishAlertResolved(alert: MonitoringAlert): Promise<void>;
  publishHealthChanged(summary: HealthSummary): Promise<void>;
}
