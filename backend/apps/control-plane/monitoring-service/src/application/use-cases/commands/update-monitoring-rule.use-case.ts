import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MonitoringRule } from '../../../domain/entities/monitoring-rule.entity';
import { MONITORING_RULE_REPOSITORY } from '../../../domain/ports/port.tokens';
import type { MonitoringRuleRepositoryPort } from '../../../domain/ports/repositories.port';

export interface UpdateMonitoringRuleCommand {
  id: string;
  name?: string;
  description?: string;
  thresholdValue?: number | string | boolean;
  contextMetricKey?: string;
  severity?: MonitoringRule['severity'];
  enabled?: boolean;
}

@Injectable()
export class UpdateMonitoringRuleUseCase {
  constructor(
    @Inject(MONITORING_RULE_REPOSITORY)
    private readonly ruleRepository: MonitoringRuleRepositoryPort,
  ) {}

  async execute(command: UpdateMonitoringRuleCommand): Promise<MonitoringRule> {
    const updated = await this.ruleRepository.update(command.id, {
      ...command,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException(`Monitoring rule ${command.id} not found`);
    }

    return updated;
  }
}
