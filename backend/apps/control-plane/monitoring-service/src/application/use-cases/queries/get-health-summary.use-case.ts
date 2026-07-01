import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HealthSummary } from '@domain/entities/health-summary.entity';
import { HEALTH_SUMMARY_REPOSITORY } from '@domain/ports/port.tokens';
import type { HealthSummaryRepositoryPort } from '@domain/ports/repositories.port';

@Injectable()
export class GetHealthSummaryUseCase {
  constructor(
    @Inject(HEALTH_SUMMARY_REPOSITORY)
    private readonly healthSummaryRepository: HealthSummaryRepositoryPort,
  ) {}

  async execute(scopeType: string, scopeId: string): Promise<HealthSummary> {
    const summary = await this.healthSummaryRepository.findByScope(
      scopeType,
      scopeId,
    );
    if (!summary) {
      throw new NotFoundException(
        `Health summary for ${scopeType}:${scopeId} not found`,
      );
    }

    return summary;
  }
}
