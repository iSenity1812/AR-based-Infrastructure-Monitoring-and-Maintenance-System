import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AlertDetailView } from '../../ports/inbound/monitoring-query.port';
import {
  ALERT_OCCURRENCE_REPOSITORY,
  ALERT_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  AlertOccurrenceRepositoryPort,
  AlertRepositoryPort,
} from '@domain/ports/repositories.port';

@Injectable()
export class GetAlertDetailUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
    @Inject(ALERT_OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepository: AlertOccurrenceRepositoryPort,
  ) {}

  async execute(alertId: string): Promise<AlertDetailView> {
    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    return {
      alert,
      occurrences: await this.occurrenceRepository.listByAlertId(alertId),
    };
  }
}
