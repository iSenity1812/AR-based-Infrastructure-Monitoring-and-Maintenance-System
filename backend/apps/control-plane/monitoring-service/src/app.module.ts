import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './adapters/inbound/http/guards/permissions.guard';
import { ExternalAlertSyncSecretGuard } from './adapters/inbound/http/guards/external-alert-sync-secret.guard';
import { ApiResponseInterceptor } from './adapters/inbound/http/interceptors/api-response.interceptor';
import { LoggingInterceptor } from './adapters/inbound/http/interceptors/logging.interceptor';
import { JwtStrategy } from './adapters/inbound/http/strategies/jwt.strategy';
import { DispatchRackAlertTransitionUseCase } from './application/use-cases/dispatch-rack-alert-transition.use-case';
import { GetNodeMetricsUseCase } from './application/use-cases/get-node-metrics.use-case';
import { GetNodeOverviewUseCase } from './application/use-cases/get-node-overview.use-case';
import { GetRackMonitoringStateUseCase } from './application/use-cases/get-rack-monitoring-state.use-case';
import { GetRackOverviewUseCase } from './application/use-cases/get-rack-overview.use-case';
import { PollRackMonitoringUseCase } from './application/use-cases/poll-rack-monitoring.use-case';
import { RackMonitoringPollingScheduler } from './application/use-cases/rack-monitoring-polling.scheduler';
import { SyncExternalAlertsUseCase } from './application/use-cases/sync-external-alerts.use-case';
import { SyncNodeOverviewRealtimeUseCase } from './application/use-cases/sync-node-overview-realtime.use-case';
import { SyncNodeMetricsRealtimeUseCase } from './application/use-cases/sync-node-metrics-realtime.use-case';
import { MonitoringRealtimePort } from './application/ports/monitoring-realtime.port';
import { NodeMetricsComposerService } from './application/services/node-metrics-composer.service';
import { NodeOverviewComposerService } from './application/services/node-overview-composer.service';
import { AlertmanagerModule } from './infrastructure/alertmanager/alertmanager.module';
import { AssetServiceGrpcModule } from './infrastructure/grpc/asset-service-grpc.module';
import { MonitoringClickhouseModule } from './infrastructure/database/clickhouse/monitoring-clickhouse.module';
import { AlertCurrentStateMongoModule } from './infrastructure/database/mongodb/alert-current-state-mongo.module';
import { MonitoringStateMongoModule } from './infrastructure/database/mongodb/monitoring-state-mongo.module';
import { MonitoringServiceConfigModule } from './infrastructure/config/monitoring-service-config.module';
import { MonitoringDatabaseModule } from './infrastructure/database/monitoring-database.module';
import { HealthController } from './presentation/http/controllers/health.controller';
import { NodeMetricsController } from './presentation/http/controllers/node-metrics.controller';
import { NodeOverviewController } from './presentation/http/controllers/node-overview.controller';
import { ExternalAlertSyncController } from './presentation/http/controllers/external-alert-sync.controller';
import { RackMonitoringStateController } from './presentation/http/controllers/rack-monitoring-state.controller';
import { RackOverviewController } from './presentation/http/controllers/rack-overview.controller';
import { ProblemDetailsExceptionFilter } from './presentation/http/filters/problem-details-exception.filter';
import { MonitoringRealtimeGateway } from './presentation/websocket/gateways/monitoring-realtime.gateway';

@Module({
  imports: [
    MonitoringServiceConfigModule,
    MonitoringDatabaseModule,
    MonitoringStateMongoModule,
    AlertCurrentStateMongoModule,
    MonitoringClickhouseModule,
    AlertmanagerModule,
    AssetServiceGrpcModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    HealthController,
    NodeMetricsController,
    NodeOverviewController,
    ExternalAlertSyncController,
    RackOverviewController,
    RackMonitoringStateController,
  ],
  providers: [
    JwtStrategy,
    ExternalAlertSyncSecretGuard,
    MonitoringRealtimeGateway,
    {
      provide: MonitoringRealtimePort,
      useExisting: MonitoringRealtimeGateway,
    },
    DispatchRackAlertTransitionUseCase,
    NodeMetricsComposerService,
    GetNodeMetricsUseCase,
    NodeOverviewComposerService,
    GetNodeOverviewUseCase,
    GetRackMonitoringStateUseCase,
    GetRackOverviewUseCase,
    PollRackMonitoringUseCase,
    RackMonitoringPollingScheduler,
    SyncExternalAlertsUseCase,
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
