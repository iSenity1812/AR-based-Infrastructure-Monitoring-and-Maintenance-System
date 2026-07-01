import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AlertStatus } from '../../../domain/constants/alert-status.enum';
import {
  MonitoringAlert,
  MonitoringAlertProps,
} from '../../../domain/entities/monitoring-alert.entity';
import {
  ALERT_REPOSITORY,
  MONITORING_EVENT_PUBLISHER,
} from '../../../domain/ports/port.tokens';
import type { AlertRepositoryPort } from '../../../domain/ports/repositories.port';
import type { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';

export type OpenAlertCommand = Omit<
  MonitoringAlertProps,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class OpenAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
    @Inject(MONITORING_EVENT_PUBLISHER)
    private readonly eventPublisher: MonitoringEventPublisherPort,
  ) {}

  async execute(command: OpenAlertCommand): Promise<MonitoringAlert> {
    const now = new Date();
    const alert = await this.alertRepository.create({
      ...command,
      id: randomUUID(),
      status: AlertStatus.OPEN,
      createdAt: now,
      updatedAt: now,
    });
    await this.eventPublisher.publishAlertOpened(alert);
    return alert;
  }
}
