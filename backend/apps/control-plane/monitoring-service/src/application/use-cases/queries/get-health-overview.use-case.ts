import { Inject, Injectable } from '@nestjs/common';
import { HealthOverviewItem } from '../../ports/inbound/monitoring-query.port';
import { MonitoringScopeType } from '@domain/constants/monitoring-scope-type.enum';
import {
  HEALTH_SUMMARY_REPOSITORY,
  MONITORING_CONTEXT_REPOSITORY,
  MONITORING_SNAPSHOT_REPOSITORY,
} from '@domain/ports/port.tokens';
import type {
  HealthSummaryRepositoryPort,
  MonitoringContextRepositoryPort,
  MonitoringSnapshotRepositoryPort,
} from '@domain/ports/repositories.port';

@Injectable()
export class GetHealthOverviewUseCase {
  constructor(
    @Inject(HEALTH_SUMMARY_REPOSITORY)
    private readonly healthSummaryRepository: HealthSummaryRepositoryPort,
    @Inject(MONITORING_CONTEXT_REPOSITORY)
    private readonly contextRepository: MonitoringContextRepositoryPort,
    @Inject(MONITORING_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: MonitoringSnapshotRepositoryPort,
  ) {}

  async execute(scopeType: MonitoringScopeType): Promise<HealthOverviewItem[]> {
    const [summaries, contexts, snapshots] = await Promise.all([
      this.healthSummaryRepository.listByScopeType(scopeType),
      this.contextRepository.listByScopeType(scopeType),
      this.snapshotRepository.listByScopeType(scopeType),
    ]);

    const items = new Map<string, HealthOverviewItem>();
    for (const summary of summaries) {
      items.set(summary.scope.scopeId, {
        scopeType: summary.scopeType,
        scopeId: summary.scopeId,
        agentId: summary.agentId,
        healthSummary: summary,
      });
    }

    for (const context of contexts) {
      const existing = items.get(context.scopeId);
      items.set(context.scopeId, {
        scopeType: context.scopeType,
        scopeId: context.scopeId,
        agentId: context.agentId,
        healthSummary: existing?.healthSummary,
        context,
        snapshot: existing?.snapshot,
      });
    }

    for (const snapshot of snapshots) {
      const existing = items.get(snapshot.scopeId);
      items.set(snapshot.scopeId, {
        scopeType: snapshot.scopeType,
        scopeId: snapshot.scopeId,
        agentId: snapshot.agentId,
        healthSummary: existing?.healthSummary,
        context: existing?.context,
        snapshot,
      });
    }

    return [...items.values()];
  }
}
