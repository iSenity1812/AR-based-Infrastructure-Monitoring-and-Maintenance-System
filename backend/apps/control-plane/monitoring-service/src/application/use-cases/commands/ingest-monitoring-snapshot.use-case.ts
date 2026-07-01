import { Inject, Injectable } from '@nestjs/common';
import { HealthStatus } from '../../../domain/constants/health-status.enum';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';
import { SnapshotIngestResult } from '../../ports/inbound/monitoring-input.port';
import { MonitoringSnapshotInputProps } from '../../../domain/entities/monitoring-input.entity';
import {
  MONITORING_CONTEXT_REPOSITORY,
  MONITORING_RULE_REPOSITORY,
  MONITORING_SNAPSHOT_REPOSITORY,
} from '../../../domain/ports/port.tokens';
import type {
  MonitoringContextRepositoryPort,
  MonitoringRuleRepositoryPort,
  MonitoringSnapshotRepositoryPort,
} from '../../../domain/ports/repositories.port';
import { EvaluateCurrentStateRuleUseCase } from './evaluate-current-state-rule.use-case';

@Injectable()
export class IngestMonitoringSnapshotUseCase {
  constructor(
    @Inject(MONITORING_SNAPSHOT_REPOSITORY)
    private readonly snapshotRepository: MonitoringSnapshotRepositoryPort,
    @Inject(MONITORING_CONTEXT_REPOSITORY)
    private readonly contextRepository: MonitoringContextRepositoryPort,
    @Inject(MONITORING_RULE_REPOSITORY)
    private readonly ruleRepository: MonitoringRuleRepositoryPort,
    private readonly evaluateCurrentStateRule: EvaluateCurrentStateRuleUseCase,
  ) {}

  async execute(
    input: MonitoringSnapshotInputProps,
  ): Promise<SnapshotIngestResult> {
    const previousSnapshot = await this.snapshotRepository.findByScope(
      input.scopeType,
      input.scopeId,
    );
    if (this.isDuplicateDelivery(previousSnapshot, input)) {
      const healthSummary =
        await this.evaluateCurrentStateRule.getHealthSummaryForScope(
          input.scopeType,
          input.scopeId,
          input.agentId,
          input.updatedAt,
        );

      return {
        snapshot: previousSnapshot,
        evaluatedRuleCount: 0,
        matchedRuleCount: 0,
        openedAlertCount: 0,
        refreshedAlertCount: 0,
        resolvedAlertCount: 0,
        healthSummary,
      };
    }

    const snapshot = await this.snapshotRepository.upsert(input);
    const context = await this.contextRepository.findByScope(
      snapshot.scopeType,
      snapshot.scopeId,
    );
    const rules = (await this.ruleRepository.listEnabled()).filter(
      (rule) =>
        rule.scopeType === snapshot.scopeType &&
        this.hasApplicableInput(snapshot, context, rule.metricKey),
    );

    let matchedRuleCount = 0;
    let openedAlertCount = 0;
    let refreshedAlertCount = 0;
    let resolvedAlertCount = 0;
    let latestHealthSummary = new HealthSummary({
      scopeType: snapshot.scopeType,
      scopeId: snapshot.scopeId,
      agentId: snapshot.agentId,
      healthStatus: HealthStatus.HEALTHY,
      openAlertCount: 0,
      warningAlertCount: 0,
      criticalAlertCount: 0,
      updatedAt: snapshot.updatedAt,
    });

    for (const rule of rules) {
      const result = await this.evaluateCurrentStateRule.execute({
        rule,
        snapshot,
        context,
      });
      latestHealthSummary = result.healthSummary;
      if (result.matched) {
        matchedRuleCount += 1;
      }
      if (result.alertAction === 'opened') {
        openedAlertCount += 1;
      }
      if (result.alertAction === 'refreshed') {
        refreshedAlertCount += 1;
      }
      if (result.alertAction === 'resolved') {
        resolvedAlertCount += 1;
      }
    }

    return {
      snapshot,
      evaluatedRuleCount: rules.length,
      matchedRuleCount,
      openedAlertCount,
      refreshedAlertCount,
      resolvedAlertCount,
      healthSummary: latestHealthSummary,
    };
  }

  private hasApplicableInput(
    snapshot: { metrics: Record<string, unknown> },
    context: { findField(metricKey: string): unknown } | null,
    metricKey: string,
  ): boolean {
    return (
      Object.prototype.hasOwnProperty.call(snapshot.metrics, metricKey) ||
      context?.findField(metricKey) !== undefined
    );
  }

  private isDuplicateDelivery(
    existing: {
      batchSequence: number;
      updatedAt: Date;
      deliveryIdentity?: string;
    } | null,
    incoming: MonitoringSnapshotInputProps,
  ): existing is NonNullable<typeof existing> {
    if (!existing) {
      return false;
    }

    if (
      incoming.deliveryIdentity &&
      existing.deliveryIdentity === incoming.deliveryIdentity
    ) {
      return true;
    }

    return (
      existing.batchSequence === incoming.batchSequence &&
      existing.updatedAt.getTime() === incoming.updatedAt.getTime()
    );
  }
}
