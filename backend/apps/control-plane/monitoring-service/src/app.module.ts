import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { MonitoringAlertsController } from './adapters/inbound/http/controllers/monitoring-alerts.controller';
import { MonitoringHealthController } from './adapters/inbound/http/controllers/monitoring-health.controller';
import { MonitoringInputsController } from './adapters/inbound/http/controllers/monitoring-inputs.controller';
import { MonitoringRulesController } from './adapters/inbound/http/controllers/monitoring-rules.controller';
import { RedisLatestSnapshotAdapter } from './adapters/inbound/derived-state/redis-latest-snapshot.adapter';
import { NoopMonitoringEventPublisher } from './adapters/outbound/events/noop-monitoring-event-publisher';
import { InMemoryAlertOccurrenceRepository } from './adapters/outbound/persistence/in-memory/in-memory-alert-occurrence.repository';
import { InMemoryAlertRepository } from './adapters/outbound/persistence/in-memory/in-memory-alert.repository';
import { InMemoryHealthSummaryRepository } from './adapters/outbound/persistence/in-memory/in-memory-health-summary.repository';
import {
  InMemoryMonitoringContextRepository,
  InMemoryMonitoringSnapshotRepository,
} from './adapters/outbound/persistence/in-memory/in-memory-monitoring-input.repository';
import { InMemoryMonitoringRuleRepository } from './adapters/outbound/persistence/in-memory/in-memory-monitoring-rule.repository';
import { GetAlertDetailUseCase } from './application/use-cases/queries/get-alert-detail.use-case';
import { GetHealthOverviewUseCase } from './application/use-cases/queries/get-health-overview.use-case';
import { GetHealthSummaryUseCase } from './application/use-cases/queries/get-health-summary.use-case';
import { ListOpenAlertsUseCase } from './application/use-cases/queries/list-open-alerts.use-case';
import { EvaluateCurrentStateRuleUseCase } from './application/use-cases/commands/evaluate-current-state-rule.use-case';
import { IngestMonitoringContextUseCase } from './application/use-cases/commands/ingest-monitoring-context.use-case';
import { IngestMonitoringSnapshotUseCase } from './application/use-cases/commands/ingest-monitoring-snapshot.use-case';
import { OpenAlertUseCase } from './application/use-cases/commands/open-alert.use-case';
import { RefreshAlertUseCase } from './application/use-cases/commands/refresh-alert.use-case';
import { RegisterMonitoringRuleUseCase } from './application/use-cases/commands/register-monitoring-rule.use-case';
import { ResolveAlertUseCase } from './application/use-cases/commands/resolve-alert.use-case';
import { UpdateMonitoringRuleUseCase } from './application/use-cases/commands/update-monitoring-rule.use-case';
import { HealthStatusDerivationService } from './domain/services/health-status-derivation.service';
import { RuleMatchService } from './domain/services/rule-match.service';
import {
  ALERT_OCCURRENCE_REPOSITORY,
  ALERT_REPOSITORY,
  HEALTH_SUMMARY_REPOSITORY,
  MONITORING_CONTEXT_REPOSITORY,
  MONITORING_EVENT_PUBLISHER,
  MONITORING_RULE_REPOSITORY,
  MONITORING_SNAPSHOT_REPOSITORY,
} from './domain/ports/port.tokens';
import { MonitoringServiceConfigModule } from './infrastructure/config/monitoring-service-config.module';
import { HealthController } from './adapters/inbound/http/controllers/health.controller';
import { JwtAuthGuard } from './adapters/inbound/http/guards/jwt-auth.guard';
import { LoggingInterceptor } from './adapters/inbound/http/interceptors/logging.interceptor';
import { JwtStrategy } from './adapters/inbound/http/strategies/jwt.strategy';

@Module({
  imports: [
    MonitoringServiceConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    HealthController,
    MonitoringRulesController,
    MonitoringInputsController,
    MonitoringAlertsController,
    MonitoringHealthController,
  ],
  providers: [
    RegisterMonitoringRuleUseCase,
    UpdateMonitoringRuleUseCase,
    OpenAlertUseCase,
    RefreshAlertUseCase,
    ResolveAlertUseCase,
    EvaluateCurrentStateRuleUseCase,
    IngestMonitoringContextUseCase,
    IngestMonitoringSnapshotUseCase,
    ListOpenAlertsUseCase,
    GetAlertDetailUseCase,
    GetHealthSummaryUseCase,
    GetHealthOverviewUseCase,
    RuleMatchService,
    HealthStatusDerivationService,
    InMemoryMonitoringRuleRepository,
    InMemoryAlertRepository,
    InMemoryAlertOccurrenceRepository,
    InMemoryHealthSummaryRepository,
    InMemoryMonitoringContextRepository,
    InMemoryMonitoringSnapshotRepository,
    NoopMonitoringEventPublisher,
    RedisLatestSnapshotAdapter,
    {
      provide: MONITORING_RULE_REPOSITORY,
      useExisting: InMemoryMonitoringRuleRepository,
    },
    {
      provide: ALERT_REPOSITORY,
      useExisting: InMemoryAlertRepository,
    },
    {
      provide: ALERT_OCCURRENCE_REPOSITORY,
      useExisting: InMemoryAlertOccurrenceRepository,
    },
    {
      provide: HEALTH_SUMMARY_REPOSITORY,
      useExisting: InMemoryHealthSummaryRepository,
    },
    {
      provide: MONITORING_CONTEXT_REPOSITORY,
      useExisting: InMemoryMonitoringContextRepository,
    },
    {
      provide: MONITORING_SNAPSHOT_REPOSITORY,
      useExisting: InMemoryMonitoringSnapshotRepository,
    },
    {
      provide: MONITORING_EVENT_PUBLISHER,
      useExisting: NoopMonitoringEventPublisher,
    },
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
