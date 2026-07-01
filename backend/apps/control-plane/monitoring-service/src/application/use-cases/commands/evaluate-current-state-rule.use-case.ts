import { Inject, Injectable } from '@nestjs/common';
import { AlertSeverity } from '../../../domain/constants/alert-severity.enum';
import { AlertStatus } from '../../../domain/constants/alert-status.enum';
import { MonitoringScopeType } from '../../../domain/constants/monitoring-scope-type.enum';
import { RuleEvaluationMode } from '../../../domain/constants/rule-evaluation-mode.enum';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';
import {
  MonitoringContextInput,
  MonitoringInputField,
  MonitoringSnapshotInput,
} from '../../../domain/entities/monitoring-input.entity';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';
import { MonitoringRule } from '../../../domain/entities/monitoring-rule.entity';
import { HealthStatusDerivationService } from '../../../domain/services/health-status-derivation.service';
import { RuleMatchService } from '../../../domain/services/rule-match.service';
import { AlertFingerprint } from '../../../domain/value-objects/alert-fingerprint.vo';
import {
  ALERT_OCCURRENCE_REPOSITORY,
  ALERT_REPOSITORY,
  HEALTH_SUMMARY_REPOSITORY,
  MONITORING_EVENT_PUBLISHER,
} from '../../../domain/ports/port.tokens';
import type {
  AlertOccurrenceRepositoryPort,
  AlertRepositoryPort,
  HealthSummaryRepositoryPort,
} from '../../../domain/ports/repositories.port';
import type { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';
import { CurrentStateEvaluationFrame } from '../dto/current-state-evaluation-frame';
import { OpenAlertUseCase } from './open-alert.use-case';
import { RefreshAlertUseCase } from './refresh-alert.use-case';
import { ResolveAlertUseCase } from './resolve-alert.use-case';

export interface EvaluateRuleCommand {
  rule: MonitoringRule;
  snapshot: MonitoringSnapshotInput;
  context?: MonitoringContextInput | null;
}

export interface EvaluateRuleResult {
  matched: boolean;
  alertAction: 'opened' | 'refreshed' | 'resolved' | 'none';
  alert?: MonitoringAlert;
  healthSummary: HealthSummary;
}

@Injectable()
export class EvaluateCurrentStateRuleUseCase {
  constructor(
    private readonly matcher: RuleMatchService,
    private readonly openAlert: OpenAlertUseCase,
    private readonly refreshAlert: RefreshAlertUseCase,
    private readonly resolveAlert: ResolveAlertUseCase,
    private readonly healthStatusDerivation: HealthStatusDerivationService,
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: AlertRepositoryPort,
    @Inject(ALERT_OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepository: AlertOccurrenceRepositoryPort,
    @Inject(HEALTH_SUMMARY_REPOSITORY)
    private readonly healthSummaryRepository: HealthSummaryRepositoryPort,
    @Inject(MONITORING_EVENT_PUBLISHER)
    private readonly eventPublisher: MonitoringEventPublisherPort,
  ) {}

  async execute(command: EvaluateRuleCommand): Promise<EvaluateRuleResult> {
    const frame = new CurrentStateEvaluationFrame(
      command.snapshot,
      command.context,
    );
    const field = frame.getObservedField(command.rule);
    const contextField = frame.getContextField(command.rule);
    const match = this.matcher.evaluate(command.rule, field, contextField);
    const fingerprint = AlertFingerprint.fromParts({
      ruleId: command.rule.id,
      scopeType: frame.scopeType,
      scopeId: frame.scopeId,
    });
    const existing = await this.alertRepository.findByFingerprint(fingerprint);

    let alertAction: EvaluateRuleResult['alertAction'] = 'none';
    let alert = existing ?? undefined;

    if (match.matched) {
      alert = await this.openOrRefreshAlert(
        command.rule,
        frame,
        field,
        match.observedValue,
        match.comparableValue,
        fingerprint,
        existing,
      );
      alertAction =
        existing && existing.status !== AlertStatus.RESOLVED
          ? 'refreshed'
          : 'opened';
      await this.occurrenceRepository.create({
        id: crypto.randomUUID(),
        alertId: alert.id,
        ruleId: command.rule.id,
        scopeType: frame.scopeType,
        scopeId: frame.scopeId,
        agentId: frame.agentId,
        metricKey: command.rule.metricKey,
        observedValue: match.observedValue,
        thresholdValue: match.comparableValue ?? match.thresholdValue,
        severity: command.rule.severity,
        observedAt: field?.observedAt ?? frame.updatedAt,
        batchSequence: command.snapshot.batchSequence,
        createdAt: new Date(),
      });
    } else if (existing && existing.status !== AlertStatus.RESOLVED) {
      alert = await this.resolveAlert.execute({
        alertId: existing.id,
        resolvedAt: field?.observedAt ?? frame.updatedAt,
      });
      alertAction = 'resolved';
    }

    const healthSummary = await this.getHealthSummaryForScope(
      frame.scopeType,
      frame.scopeId,
      frame.agentId,
      frame.updatedAt,
    );

    return {
      matched: match.matched,
      alertAction,
      alert,
      healthSummary,
    };
  }

  private async openOrRefreshAlert(
    rule: MonitoringRule,
    frame: CurrentStateEvaluationFrame,
    field: MonitoringInputField | undefined,
    observedValue: number | string | boolean | null,
    comparableValue: number | string | boolean | undefined,
    fingerprint: string,
    existing: MonitoringAlert | null,
  ): Promise<MonitoringAlert> {
    const observedAt = field?.observedAt ?? frame.updatedAt;
    const summary = this.buildAlertSummary(
      rule,
      observedValue,
      comparableValue,
      field,
    );
    if (existing && existing.status !== AlertStatus.RESOLVED) {
      return this.refreshAlert.execute({
        alertId: existing.id,
        seenAt: observedAt,
        summary,
      });
    }

    return this.openAlert.execute({
      fingerprint,
      ruleId: rule.id,
      scopeType: frame.scopeType,
      scopeId: frame.scopeId,
      agentId: frame.agentId,
      metricKey: rule.metricKey,
      severity: rule.severity,
      title: `${frame.scopeType}:${frame.scopeId} ${rule.metricKey} breached`,
      summary,
      firstSeenAt: observedAt,
      lastSeenAt: observedAt,
    });
  }

  async getHealthSummaryForScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
    agentId?: string,
    updatedAt?: Date,
  ): Promise<HealthSummary> {
    const alerts = await this.alertRepository.listByScope(scopeType, scopeId);
    const openAlerts = alerts.filter(
      (item) => item.status !== AlertStatus.RESOLVED,
    );
    const warningCount = openAlerts.filter(
      (item) => item.severity === AlertSeverity.WARNING,
    ).length;
    const criticalCount = openAlerts.filter(
      (item) => item.severity === AlertSeverity.CRITICAL,
    ).length;

    const previous = await this.healthSummaryRepository.findByScope(
      scopeType,
      scopeId,
    );
    const summary = await this.healthSummaryRepository.upsert({
      scopeType,
      scopeId,
      agentId,
      healthStatus: this.healthStatusDerivation.deriveStatus({
        openAlertCount: openAlerts.length,
        warningAlertCount: warningCount,
        criticalAlertCount: criticalCount,
      }),
      highestSeverity: this.healthStatusDerivation.deriveHighestSeverity({
        openAlertCount: openAlerts.length,
        warningAlertCount: warningCount,
        criticalAlertCount: criticalCount,
      }),
      openAlertCount: openAlerts.length,
      warningAlertCount: warningCount,
      criticalAlertCount: criticalCount,
      updatedAt: updatedAt ?? new Date(),
    });
    if (this.hasHealthChanged(previous, summary)) {
      await this.eventPublisher.publishHealthChanged(summary);
    }
    return summary;
  }

  private buildAlertSummary(
    rule: MonitoringRule,
    observedValue: number | string | boolean | null,
    comparableValue: number | string | boolean | undefined,
    field?: MonitoringInputField,
  ): string {
    const unitSuffix = field?.unit ? ` ${field.unit}` : '';
    if (
      rule.evaluationMode === RuleEvaluationMode.CAPACITY_RELATIVE &&
      rule.contextMetricKey
    ) {
      return `Observed ${String(observedValue)}${unitSuffix} for ${rule.metricKey} compared with ${String(comparableValue)} from ${rule.contextMetricKey}`;
    }

    if (comparableValue !== undefined) {
      return `Observed ${String(observedValue)}${unitSuffix} for ${rule.metricKey} against ${rule.operator} ${String(comparableValue)}`;
    }

    return `Observed ${String(observedValue)}${unitSuffix} for ${rule.metricKey}`;
  }

  private hasHealthChanged(
    previous: HealthSummary | null,
    next: HealthSummary,
  ): boolean {
    if (!previous) {
      return true;
    }

    return (
      previous.healthStatus !== next.healthStatus ||
      previous.highestSeverity !== next.highestSeverity ||
      previous.openAlertCount !== next.openAlertCount ||
      previous.warningAlertCount !== next.warningAlertCount ||
      previous.criticalAlertCount !== next.criticalAlertCount
    );
  }
}
