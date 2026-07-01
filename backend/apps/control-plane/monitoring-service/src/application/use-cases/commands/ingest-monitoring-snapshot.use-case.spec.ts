import { AlertSeverity } from '../../../domain/constants/alert-severity.enum';
import { MonitoringScopeType } from '../../../domain/constants/monitoring-scope-type.enum';
import { RuleEvaluationMode } from '../../../domain/constants/rule-evaluation-mode.enum';
import { RuleOperator } from '../../../domain/constants/rule-operator.enum';
import { HealthStatus } from '../../../domain/constants/health-status.enum';
import { HealthStatusDerivationService } from '../../../domain/services/health-status-derivation.service';
import { RuleMatchService } from '../../../domain/services/rule-match.service';
import { NoopMonitoringEventPublisher } from '../../../adapters/outbound/events/noop-monitoring-event-publisher';
import { InMemoryAlertOccurrenceRepository } from '../../../adapters/outbound/persistence/in-memory/in-memory-alert-occurrence.repository';
import { InMemoryAlertRepository } from '../../../adapters/outbound/persistence/in-memory/in-memory-alert.repository';
import { InMemoryHealthSummaryRepository } from '../../../adapters/outbound/persistence/in-memory/in-memory-health-summary.repository';
import {
  InMemoryMonitoringContextRepository,
  InMemoryMonitoringSnapshotRepository,
} from '../../../adapters/outbound/persistence/in-memory/in-memory-monitoring-input.repository';
import { InMemoryMonitoringRuleRepository } from '../../../adapters/outbound/persistence/in-memory/in-memory-monitoring-rule.repository';
import { EvaluateCurrentStateRuleUseCase } from './evaluate-current-state-rule.use-case';
import { IngestMonitoringSnapshotUseCase } from './ingest-monitoring-snapshot.use-case';
import { OpenAlertUseCase } from './open-alert.use-case';
import { RefreshAlertUseCase } from './refresh-alert.use-case';
import { ResolveAlertUseCase } from './resolve-alert.use-case';
import { MonitoringAlert } from '../../../domain/entities/monitoring-alert.entity';
import { HealthSummary } from '../../../domain/entities/health-summary.entity';
import { MonitoringEventPublisherPort } from '../../../domain/ports/event-publisher.port';

describe('IngestMonitoringSnapshotUseCase', () => {
  class CapturingMonitoringEventPublisher
    implements MonitoringEventPublisherPort
  {
    readonly opened: MonitoringAlert[] = [];
    readonly updated: MonitoringAlert[] = [];
    readonly resolved: MonitoringAlert[] = [];
    readonly healthChanged: HealthSummary[] = [];

    publishAlertOpened(alert: MonitoringAlert): Promise<void> {
      this.opened.push(alert);
      return Promise.resolve();
    }

    publishAlertUpdated(alert: MonitoringAlert): Promise<void> {
      this.updated.push(alert);
      return Promise.resolve();
    }

    publishAlertResolved(alert: MonitoringAlert): Promise<void> {
      this.resolved.push(alert);
      return Promise.resolve();
    }

    publishHealthChanged(summary: HealthSummary): Promise<void> {
      this.healthChanged.push(summary);
      return Promise.resolve();
    }
  }

  const createHarness = () => {
    const ruleRepository = new InMemoryMonitoringRuleRepository();
    const contextRepository = new InMemoryMonitoringContextRepository();
    const snapshotRepository = new InMemoryMonitoringSnapshotRepository();
    const alertRepository = new InMemoryAlertRepository();
    const occurrenceRepository = new InMemoryAlertOccurrenceRepository();
    const healthSummaryRepository = new InMemoryHealthSummaryRepository();
    const eventPublisher = new CapturingMonitoringEventPublisher();

    const openAlert = new OpenAlertUseCase(alertRepository, eventPublisher);
    const refreshAlert = new RefreshAlertUseCase(
      alertRepository,
      eventPublisher,
    );
    const resolveAlert = new ResolveAlertUseCase(
      alertRepository,
      eventPublisher,
    );
    const evaluateRule = new EvaluateCurrentStateRuleUseCase(
      new RuleMatchService(),
      openAlert,
      refreshAlert,
      resolveAlert,
      new HealthStatusDerivationService(),
      alertRepository,
      occurrenceRepository,
      healthSummaryRepository,
      eventPublisher,
    );
    const ingestSnapshot = new IngestMonitoringSnapshotUseCase(
      snapshotRepository,
      contextRepository,
      ruleRepository,
      evaluateRule,
    );

    return {
      ruleRepository,
      contextRepository,
      snapshotRepository,
      alertRepository,
      occurrenceRepository,
      healthSummaryRepository,
      eventPublisher,
      ingestSnapshot,
    };
  };

  it('opens an alert on breach and resolves it when the metric recovers', async () => {
    const { ruleRepository, alertRepository, ingestSnapshot } = createHarness();

    await ruleRepository.create({
      id: 'rule-cpu-hot',
      name: 'CPU hot',
      scopeType: MonitoringScopeType.NODE,
      metricKey: 'node.cpu_usage_pct',
      operator: RuleOperator.GREATER_THAN,
      thresholdValue: 90,
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    const breached = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 95,
          observedAt: new Date('2026-06-26T00:01:00Z'),
          unit: '%',
          source: 'snapshot',
        },
      },
      batchSequence: 1,
      updatedAt: new Date('2026-06-26T00:01:00Z'),
    });

    expect(breached.openedAlertCount).toBe(1);
    expect(breached.matchedRuleCount).toBe(1);
    expect(breached.healthSummary.openAlertCount).toBe(1);

    const recovered = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 30,
          observedAt: new Date('2026-06-26T00:02:00Z'),
          unit: '%',
          source: 'snapshot',
        },
      },
      batchSequence: 2,
      updatedAt: new Date('2026-06-26T00:02:00Z'),
    });

    expect(recovered.resolvedAlertCount).toBe(1);
    expect(recovered.healthSummary.openAlertCount).toBe(0);
    expect(await alertRepository.listOpen()).toHaveLength(0);
  });

  it('refreshes an existing alert without creating duplicates and creates a new alert after recurrence', async () => {
    const { ruleRepository, alertRepository, occurrenceRepository, ingestSnapshot } =
      createHarness();

    await ruleRepository.create({
      id: 'rule-cpu-hot',
      name: 'CPU hot',
      scopeType: MonitoringScopeType.NODE,
      metricKey: 'node.cpu_usage_pct',
      operator: RuleOperator.GREATER_THAN,
      thresholdValue: 90,
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 95,
          observedAt: new Date('2026-06-26T00:01:00Z'),
        },
      },
      batchSequence: 1,
      updatedAt: new Date('2026-06-26T00:01:00Z'),
    });

    const refreshed = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 96,
          observedAt: new Date('2026-06-26T00:02:00Z'),
        },
      },
      batchSequence: 2,
      updatedAt: new Date('2026-06-26T00:02:00Z'),
    });

    expect(refreshed.openedAlertCount).toBe(0);
    expect(refreshed.refreshedAlertCount).toBe(1);
    expect(await alertRepository.listOpen()).toHaveLength(1);

    await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 40,
          observedAt: new Date('2026-06-26T00:03:00Z'),
        },
      },
      batchSequence: 3,
      updatedAt: new Date('2026-06-26T00:03:00Z'),
    });

    const reopened = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 94,
          observedAt: new Date('2026-06-26T00:04:00Z'),
        },
      },
      batchSequence: 4,
      updatedAt: new Date('2026-06-26T00:04:00Z'),
    });

    expect(reopened.openedAlertCount).toBe(1);
    expect(await occurrenceRepository.listByAlertId((await alertRepository.listOpen())[0].id)).toHaveLength(1);
  });

  it('supports capacity-relative rules with context baselines', async () => {
    const { ruleRepository, contextRepository, ingestSnapshot } = createHarness();

    await ruleRepository.create({
      id: 'rule-service-replica-gap',
      name: 'Replica gap',
      scopeType: MonitoringScopeType.SERVICE,
      metricKey: 'service.running_container_count',
      contextMetricKey: 'service.container_count',
      operator: RuleOperator.LESS_THAN,
      severity: AlertSeverity.WARNING,
      enabled: true,
      evaluationMode: RuleEvaluationMode.CAPACITY_RELATIVE,
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    await contextRepository.upsert({
      scopeType: MonitoringScopeType.SERVICE,
      scopeId: 'vector',
      agentId: 'node-01',
      capacity: {
        'service.container_count': {
          metricKey: 'service.container_count',
          value: 2,
          observedAt: new Date('2026-06-26T00:00:00Z'),
        },
      },
      batchSequence: 1,
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    const result = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.SERVICE,
      scopeId: 'vector',
      agentId: 'node-01',
      metrics: {
        'service.running_container_count': {
          metricKey: 'service.running_container_count',
          value: 1,
          observedAt: new Date('2026-06-26T00:01:00Z'),
        },
      },
      batchSequence: 2,
      updatedAt: new Date('2026-06-26T00:01:00Z'),
    });

    expect(result.openedAlertCount).toBe(1);
    expect(result.healthSummary.healthStatus).toBe(HealthStatus.WARNING);
  });

  it('skips duplicate snapshot deliveries using delivery identity', async () => {
    const { ruleRepository, occurrenceRepository, alertRepository, ingestSnapshot } =
      createHarness();

    await ruleRepository.create({
      id: 'rule-cpu-hot',
      name: 'CPU hot',
      scopeType: MonitoringScopeType.NODE,
      metricKey: 'node.cpu_usage_pct',
      operator: RuleOperator.GREATER_THAN,
      thresholdValue: 90,
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    const first = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 95,
          observedAt: new Date('2026-06-26T00:01:00Z'),
        },
      },
      batchSequence: 1,
      deliveryIdentity: 'delivery-1',
      updatedAt: new Date('2026-06-26T00:01:00Z'),
    });

    const duplicate = await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 95,
          observedAt: new Date('2026-06-26T00:01:00Z'),
        },
      },
      batchSequence: 99,
      deliveryIdentity: 'delivery-1',
      updatedAt: new Date('2026-06-26T00:05:00Z'),
    });

    const openAlert = (await alertRepository.listOpen())[0];
    expect(first.openedAlertCount).toBe(1);
    expect(duplicate.evaluatedRuleCount).toBe(0);
    expect(await occurrenceRepository.listByAlertId(openAlert.id)).toHaveLength(1);
  });

  it('publishes health changes only when the health state actually changes', async () => {
    const { ruleRepository, eventPublisher, ingestSnapshot } = createHarness();

    await ruleRepository.create({
      id: 'rule-cpu-hot',
      name: 'CPU hot',
      scopeType: MonitoringScopeType.NODE,
      metricKey: 'node.cpu_usage_pct',
      operator: RuleOperator.GREATER_THAN,
      thresholdValue: 90,
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      evaluationMode: RuleEvaluationMode.THRESHOLD,
      createdAt: new Date('2026-06-26T00:00:00Z'),
      updatedAt: new Date('2026-06-26T00:00:00Z'),
    });

    await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 95,
          observedAt: new Date('2026-06-26T00:01:00Z'),
        },
      },
      batchSequence: 1,
      updatedAt: new Date('2026-06-26T00:01:00Z'),
    });

    await ingestSnapshot.execute({
      scopeType: MonitoringScopeType.NODE,
      scopeId: 'node-01',
      agentId: 'node-01',
      metrics: {
        'node.cpu_usage_pct': {
          metricKey: 'node.cpu_usage_pct',
          value: 96,
          observedAt: new Date('2026-06-26T00:02:00Z'),
        },
      },
      batchSequence: 2,
      updatedAt: new Date('2026-06-26T00:02:00Z'),
    });

    expect(eventPublisher.healthChanged).toHaveLength(1);
  });
});
