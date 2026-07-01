import { Inject, Injectable } from '@nestjs/common';
import { MonitoringAlert } from '@domain/entities/monitoring-alert.entity';
import { ALERT_REPOSITORY } from '@domain/ports/port.tokens';
import type { AlertRepositoryPort } from '@domain/ports/repositories.port';

@Injectable()
export class ListOpenAlertsUseCase {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
  ) {}

  async execute(): Promise<MonitoringAlert[]> {
    return this.alertRepository.listOpen();
  }
}
