import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './adapters/inbound/http/guards/jwt-auth.guard';
import { PermissionsGuard } from './adapters/inbound/http/guards/permissions.guard';
import { ApiResponseInterceptor } from './adapters/inbound/http/interceptors/api-response.interceptor';
import { LoggingInterceptor } from './adapters/inbound/http/interceptors/logging.interceptor';
import { JwtStrategy } from './adapters/inbound/http/strategies/jwt.strategy';
import { DispatchRackAlertTransitionUseCase } from './application/use-cases/dispatch-rack-alert-transition.use-case';
import { GetRackMonitoringStateUseCase } from './application/use-cases/get-rack-monitoring-state.use-case';
import { GetRackOverviewUseCase } from './application/use-cases/get-rack-overview.use-case';
import { PollRackMonitoringUseCase } from './application/use-cases/poll-rack-monitoring.use-case';
import { MonitoringRealtimePort } from './application/ports/monitoring-realtime.port';
import { AlertmanagerModule } from './infrastructure/alertmanager/alertmanager.module';
import { AssetServiceGrpcModule } from './infrastructure/grpc/asset-service-grpc.module';
import { MonitoringClickhouseModule } from './infrastructure/database/clickhouse/monitoring-clickhouse.module';
import { MonitoringStateMongoModule } from './infrastructure/database/mongodb/monitoring-state-mongo.module';
import { MonitoringServiceConfigModule } from './infrastructure/config/monitoring-service-config.module';
import { MonitoringDatabaseModule } from './infrastructure/database/monitoring-database.module';
import { HealthController } from './presentation/http/controllers/health.controller';
import { RackMonitoringStateController } from './presentation/http/controllers/rack-monitoring-state.controller';
import { RackOverviewController } from './presentation/http/controllers/rack-overview.controller';
import { ProblemDetailsExceptionFilter } from './presentation/http/filters/problem-details-exception.filter';
import { MonitoringRealtimeGateway } from './presentation/websocket/gateways/monitoring-realtime.gateway';

@Module({
  imports: [
    MonitoringServiceConfigModule,
    MonitoringDatabaseModule,
    MonitoringStateMongoModule,
    MonitoringClickhouseModule,
    AlertmanagerModule,
    AssetServiceGrpcModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [
    HealthController,
    RackOverviewController,
    RackMonitoringStateController,
  ],
  providers: [
    JwtStrategy,
    MonitoringRealtimeGateway,
    {
      provide: MonitoringRealtimePort,
      useExisting: MonitoringRealtimeGateway,
    },
    DispatchRackAlertTransitionUseCase,
    GetRackMonitoringStateUseCase,
    GetRackOverviewUseCase,
    PollRackMonitoringUseCase,
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
