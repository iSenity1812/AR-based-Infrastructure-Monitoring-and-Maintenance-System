import { Injectable } from '@nestjs/common';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';
import { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';

@Injectable()
export class NoopMonitoringEventPublisher implements MonitoringEventPublisherPort {
  publishAlertOpened(alert: MonitoringAlert): Promise<void> {
    void alert;
    return Promise.resolve();
  }

  publishAlertUpdated(alert: MonitoringAlert): Promise<void> {
    void alert;
    return Promise.resolve();
  }

  publishAlertResolved(alert: MonitoringAlert): Promise<void> {
    void alert;
    return Promise.resolve();
  }

  publishHealthChanged(summary: HealthSummary): Promise<void> {
    void summary;
    return Promise.resolve();
  }
}
