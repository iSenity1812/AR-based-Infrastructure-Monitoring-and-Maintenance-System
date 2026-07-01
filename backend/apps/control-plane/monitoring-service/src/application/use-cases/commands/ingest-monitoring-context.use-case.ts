import { Inject, Injectable } from '@nestjs/common';
import {
  MonitoringContextInput,
  MonitoringContextInputProps,
} from '../../../domain/entities/monitoring-input.entity';
import { MONITORING_CONTEXT_REPOSITORY } from '../../../domain/ports/port.tokens';
import type { MonitoringContextRepositoryPort } from '../../../domain/ports/repositories.port';

@Injectable()
export class IngestMonitoringContextUseCase {
  constructor(
    @Inject(MONITORING_CONTEXT_REPOSITORY)
    private readonly contextRepository: MonitoringContextRepositoryPort,
  ) {}

  async execute(
    input: MonitoringContextInputProps,
  ): Promise<MonitoringContextInput> {
    return this.contextRepository.upsert(input);
  }
}
