import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALERT_REPOSITORY,
  MONITORING_EVENT_PUBLISHER,
} from '../../../domain/ports/port.tokens';
import type { AlertRepositoryPort } from '../../../domain/ports/repositories.port';
import type { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';

export interface ResolveAlertCommand {
  alertId: string;
  resolvedAt: Date;
}

@Injectable()
export class ResolveAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
    @Inject(MONITORING_EVENT_PUBLISHER)
    private readonly eventPublisher: MonitoringEventPublisherPort,
  ) {}

  async execute(command: ResolveAlertCommand): Promise<MonitoringAlert> {
    const existing = await this.alertRepository.findById(command.alertId);
    if (!existing) {
      throw new NotFoundException(`Alert ${command.alertId} not found`);
    }

    const resolved = existing.resolve(command.resolvedAt);
    const updated = await this.alertRepository.update(command.alertId, {
      ...resolved,
    });

    if (!updated) {
      throw new NotFoundException(`Alert ${command.alertId} not found`);
    }

    await this.eventPublisher.publishAlertResolved(updated);
    return updated;
  }
}
