import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ALERT_REPOSITORY,
  MONITORING_EVENT_PUBLISHER,
} from '../../../domain/ports/port.tokens';
import type { AlertRepositoryPort } from '../../../domain/ports/repositories.port';
import type { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';

export interface RefreshAlertCommand {
  alertId: string;
  seenAt: Date;
  summary?: string;
}

@Injectable()
export class RefreshAlertUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
    @Inject(MONITORING_EVENT_PUBLISHER)
    private readonly eventPublisher: MonitoringEventPublisherPort,
  ) {}

  async execute(command: RefreshAlertCommand): Promise<MonitoringAlert> {
    const existing = await this.alertRepository.findById(command.alertId);
    if (!existing) {
      throw new NotFoundException(`Alert ${command.alertId} not found`);
    }

    const refreshed = existing.refreshObservation(
      command.seenAt,
      command.summary,
    );
    const updated = await this.alertRepository.update(command.alertId, {
      ...refreshed,
    });

    if (!updated) {
      throw new NotFoundException(`Alert ${command.alertId} not found`);
    }

    if (
      existing.summary !== updated.summary ||
      existing.lastSeenAt.getTime() !== updated.lastSeenAt.getTime()
    ) {
      await this.eventPublisher.publishAlertUpdated(updated);
    }
    return updated;
  }
}
