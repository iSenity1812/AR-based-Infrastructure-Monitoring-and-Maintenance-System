import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './adapters/inbound/http/guards/permissions.guard';
import { ExternalAlertSyncSecretGuard } from './adapters/inbound/http/guards/external-alert-sync-secret.guard';
import { ApiResponseInterceptor } from './adapters/inbound/http/interceptors/api-response.interceptor';
import { LoggingInterceptor } from './adapters/inbound/http/interceptors/logging.interceptor';
import { JwtStrategy } from './adapters/inbound/http/strategies/jwt.strategy';
import { DispatchRackAlertTransitionUseCase } from './application/use-cases/dispatch-rack-alert-transition.use-case';
import { CreateIncidentFromAlertUseCase } from './application/use-cases/create-incident-from-alert.use-case';
import { GetNodeMetricsUseCase } from './application/use-cases/get-node-metrics.use-case';
import { GetNodeMonitoringStateUseCase } from './application/use-cases/get-node-monitoring-state.use-case';
import { GetCollectorLivenessUseCase } from './application/use-cases/get-collector-liveness.use-case';
import { GetNodeOverviewUseCase } from './application/use-cases/get-node-overview.use-case';
import { GetRackMonitoringStateUseCase } from './application/use-cases/get-rack-monitoring-state.use-case';
import { GetRackOverviewUseCase } from './application/use-cases/get-rack-overview.use-case';
import { GetScopeInvestigationUseCase } from './application/use-cases/get-scope-investigation.use-case';
import { NodeRealtimeSyncScheduler } from './application/use-cases/node-realtime-sync.scheduler';
import { PollRackMonitoringUseCase } from './application/use-cases/poll-rack-monitoring.use-case';
import { RackMonitoringPollingScheduler } from './application/use-cases/rack-monitoring-polling.scheduler';
import { SyncExternalAlertsUseCase } from './application/use-cases/sync-external-alerts.use-case';
import { SyncCollectorHeartbeatUseCase } from './application/use-cases/sync-collector-heartbeat.use-case';
import { SyncNodeLivenessTransitionsUseCase } from './application/use-cases/sync-node-liveness-transitions.use-case';
import { SyncNodeOverviewRealtimeUseCase } from './application/use-cases/sync-node-overview-realtime.use-case';
import { SyncNodeMetricsRealtimeUseCase } from './application/use-cases/sync-node-metrics-realtime.use-case';
import { MonitoringRealtimePort } from './application/ports/monitoring-realtime.port';
import { IncidentWorkflowClientPort } from './application/ports/incident-workflow-client.port';
import { AssetNodeContextProvider } from './application/ports/asset-node-context.provider';
import { CollectorLivenessService } from './application/services/collector-liveness.service';
import { IncidentContextSnapshotComposerService } from './application/services/incident-context-snapshot-composer.service';
import { InvestigationWindowPolicyService } from './application/services/investigation-window-policy.service';
import { MonitoringIncidentPolicyService } from './application/services/monitoring-incident-policy.service';
import { MonitoringWorkflowSystemAuthService } from './application/services/monitoring-workflow-system-auth.service';
import { NodeMetricsComposerService } from './application/services/node-metrics-composer.service';
import { NodeOverviewComposerService } from './application/services/node-overview-composer.service';
import { AlertmanagerModule } from './infrastructure/alertmanager/alertmanager.module';
import { AssetServiceGrpcModule } from './infrastructure/grpc/asset-service-grpc.module';
import { AssetNodeContextHttpProvider } from './infrastructure/http/asset-node-context-http.provider';
import { IncidentWorkflowHttpClient } from './infrastructure/http/incident-workflow-http.client';
import { MonitoringClickhouseModule } from './infrastructure/database/clickhouse/monitoring-clickhouse.module';
import { AlertIncidentHandoffAuditMongoModule } from './infrastructure/database/mongodb/alert-incident-handoff-audit-mongo.module';
import { AlertCurrentStateMongoModule } from './infrastructure/database/mongodb/alert-current-state-mongo.module';
import { CollectorLivenessMongoModule } from './infrastructure/database/mongodb/collector-liveness-mongo.module';
import { MonitoringEventMongoModule } from './infrastructure/database/mongodb/monitoring-event-mongo.module';
import { MonitoringStateMongoModule } from './infrastructure/database/mongodb/monitoring-state-mongo.module';
import { MonitoringServiceConfigModule } from './infrastructure/config/monitoring-service-config.module';
import { MonitoringDatabaseModule } from './infrastructure/database/monitoring-database.module';
import { HealthController } from './presentation/http/controllers/health.controller';
import { AlertIncidentHandoffController } from './presentation/http/controllers/alert-incident-handoff.controller';
import { CollectorHeartbeatSyncController } from './presentation/http/controllers/collector-heartbeat-sync.controller';
import { CollectorLivenessController } from './presentation/http/controllers/collector-liveness.controller';
import { NodeMetricsController } from './presentation/http/controllers/node-metrics.controller';
import { NodeMonitoringStateController } from './presentation/http/controllers/node-monitoring-state.controller';
import { NodeOverviewController } from './presentation/http/controllers/node-overview.controller';
import { ExternalAlertSyncController } from './presentation/http/controllers/external-alert-sync.controller';
import { RackMonitoringStateController } from './presentation/http/controllers/rack-monitoring-state.controller';
import { RackOverviewController } from './presentation/http/controllers/rack-overview.controller';
import { ScopeInvestigationController } from './presentation/http/controllers/scope-investigation.controller';
import { ProblemDetailsExceptionFilter } from './presentation/http/filters/problem-details-exception.filter';
import { MonitoringRealtimeGateway } from './presentation/websocket/gateways/monitoring-realtime.gateway';

@Module({
  imports: [
    MonitoringServiceConfigModule,
    MonitoringDatabaseModule,
    MonitoringStateMongoModule,
    AlertIncidentHandoffAuditMongoModule,
    AlertCurrentStateMongoModule,
    CollectorLivenessMongoModule,
    MonitoringEventMongoModule,
    MonitoringClickhouseModule,
    AlertmanagerModule,
    AssetServiceGrpcModule,
    JwtModule.register({}),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    HealthController,
    AlertIncidentHandoffController,
    CollectorHeartbeatSyncController,
    CollectorLivenessController,
    NodeMetricsController,
    NodeMonitoringStateController,
    NodeOverviewController,
    ExternalAlertSyncController,
    RackOverviewController,
    RackMonitoringStateController,
    ScopeInvestigationController,
  ],
  providers: [
    JwtStrategy,
    ExternalAlertSyncSecretGuard,
    MonitoringRealtimeGateway,
    {
      provide: MonitoringRealtimePort,
      useExisting: MonitoringRealtimeGateway,
    },
    {
      provide: IncidentWorkflowClientPort,
      useClass: IncidentWorkflowHttpClient,
    },
    {
      provide: AssetNodeContextProvider,
      useClass: AssetNodeContextHttpProvider,
    },
    CreateIncidentFromAlertUseCase,
    DispatchRackAlertTransitionUseCase,
    CollectorLivenessService,
    IncidentContextSnapshotComposerService,
    MonitoringIncidentPolicyService,
    MonitoringWorkflowSystemAuthService,
    GetCollectorLivenessUseCase,
    NodeMetricsComposerService,
    GetNodeMetricsUseCase,
    GetNodeMonitoringStateUseCase,
    NodeOverviewComposerService,
    GetNodeOverviewUseCase,
    GetRackMonitoringStateUseCase,
    GetRackOverviewUseCase,
    GetScopeInvestigationUseCase,
    InvestigationWindowPolicyService,
    NodeRealtimeSyncScheduler,
    PollRackMonitoringUseCase,
    RackMonitoringPollingScheduler,
    SyncCollectorHeartbeatUseCase,
    SyncExternalAlertsUseCase,
    SyncNodeLivenessTransitionsUseCase,
    SyncNodeMetricsRealtimeUseCase,
    SyncNodeOverviewRealtimeUseCase,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsExceptionFilter,
    },
  ],
})
export class AppModule {}
