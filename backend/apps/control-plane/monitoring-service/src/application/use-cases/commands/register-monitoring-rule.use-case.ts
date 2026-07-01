import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MonitoringRuleProps,
  MonitoringRule,
} from '../../../domain/entities/monitoring-rule.entity';
import type { MonitoringRuleRepositoryPort } from '../../../domain/ports/repositories.port';
import { MONITORING_RULE_REPOSITORY } from '../../../domain/ports/port.tokens';

export type RegisterMonitoringRuleCommand = Omit<
  MonitoringRuleProps,
  'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class RegisterMonitoringRuleUseCase {
  constructor(
    @Inject(MONITORING_RULE_REPOSITORY)
    private readonly ruleRepository: MonitoringRuleRepositoryPort,
  ) {}

  async execute(
    command: RegisterMonitoringRuleCommand,
  ): Promise<MonitoringRule> {
    const now = new Date();
    return this.ruleRepository.create({
      ...command,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }
}
