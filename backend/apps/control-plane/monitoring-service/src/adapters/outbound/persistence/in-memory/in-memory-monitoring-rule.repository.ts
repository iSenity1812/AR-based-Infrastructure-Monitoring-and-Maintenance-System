import { Injectable } from '@nestjs/common';
import {
  MonitoringRule,
  MonitoringRuleProps,
} from '../../../../domain/entities/monitoring-rule.entity';
import { MonitoringRuleRepositoryPort } from '../../../../domain/ports/repositories.port';

@Injectable()
export class InMemoryMonitoringRuleRepository implements MonitoringRuleRepositoryPort {
  private readonly items = new Map<string, MonitoringRule>();

  create(input: MonitoringRuleProps): Promise<MonitoringRule> {
    const entity = new MonitoringRule(input);
    this.items.set(entity.id, entity);
    return Promise.resolve(entity);
  }

  update(
    id: string,
    input: Partial<MonitoringRuleProps>,
  ): Promise<MonitoringRule | null> {
    const existing = this.items.get(id);
    if (!existing) {
      return Promise.resolve(null);
    }

    const updated = new MonitoringRule({
      ...existing,
      ...input,
      id,
    });
    this.items.set(id, updated);
    return Promise.resolve(updated);
  }

  findById(id: string): Promise<MonitoringRule | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  listAll(): Promise<MonitoringRule[]> {
    return Promise.resolve([...this.items.values()]);
  }

  listEnabled(): Promise<MonitoringRule[]> {
    return Promise.resolve(
      [...this.items.values()].filter((item) => item.enabled),
    );
  }
}
