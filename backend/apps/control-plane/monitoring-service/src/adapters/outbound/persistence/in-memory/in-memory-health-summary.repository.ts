import { Injectable } from '@nestjs/common';
import {
  HealthSummary,
  HealthSummaryProps,
} from '../../../../domain/entities/health-summary.entity';
import { MonitoringScopeType } from '../../../../domain/constants/monitoring-scope-type.enum';
import { HealthSummaryRepositoryPort } from '../../../../domain/ports/repositories.port';

@Injectable()
export class InMemoryHealthSummaryRepository implements HealthSummaryRepositoryPort {
  private readonly items = new Map<string, HealthSummary>();

  upsert(input: HealthSummaryProps): Promise<HealthSummary> {
    const entity = new HealthSummary({
      ...input,
      id: input.id ?? this.toKey(input.scopeType, input.scopeId),
    });
    this.items.set(
      entity.id ?? this.toKey(entity.scopeType, entity.scopeId),
      entity,
    );
    return Promise.resolve(entity);
  }

  findByScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
  ): Promise<HealthSummary | null> {
    return Promise.resolve(
      this.items.get(this.toKey(scopeType, scopeId)) ?? null,
    );
  }

  listByScopeType(scopeType: MonitoringScopeType): Promise<HealthSummary[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.scopeType === scopeType),
    );
  }

  private toKey(scopeType: MonitoringScopeType, scopeId: string): string {
    return `${scopeType}|${scopeId}`;
  }
}
