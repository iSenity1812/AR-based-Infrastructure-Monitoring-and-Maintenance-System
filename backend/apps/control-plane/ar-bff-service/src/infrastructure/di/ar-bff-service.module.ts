import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';

import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import {
  ASSET_SERVICE_CLIENT,
  INCIDENT_WORKFLOW_SERVICE_CLIENT,
  MONITORING_SERVICE_CLIENT,
} from '@application/ports/client.tokens';
import { IncidentWorkflowServiceClientPort } from '@application/ports/incident-workflow-service-client.port';
import { MonitoringServiceClientPort } from '@application/ports/monitoring-service-client.port';
import { AssetServiceHttpClient } from '@infrastructure/http/asset-service-http.client';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { MarkerScanController } from '@presentation/http/controllers/marker-scan.controller';
import { ApiResponseInterceptor } from '@presentation/http/interceptors/api-response.interceptor';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { JwtStrategy } from '@presentation/http/strategies/jwt.strategy';
import { GetHealthUseCase } from '@use-cases/queries/get-health.use-case';
import { ScanMarkerUseCase } from '@use-cases/queries/scan-marker.use-case';
import { GET_HEALTH_USE_CASE, SCAN_MARKER_USE_CASE } from './use-case.tokens';

@Module({
  imports: [PassportModule],
  controllers: [HealthController, MarkerScanController],
  providers: [
    ArBffServiceConfig,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: GET_HEALTH_USE_CASE,
      useClass: GetHealthUseCase,
    },
    {
      provide: SCAN_MARKER_USE_CASE,
      useClass: ScanMarkerUseCase,
    },
    {
      provide: ASSET_SERVICE_CLIENT,
      useClass: AssetServiceHttpClient,
    },
    {
      provide: MONITORING_SERVICE_CLIENT,
      useValue: null satisfies MonitoringServiceClientPort | null,
    },
    {
      provide: INCIDENT_WORKFLOW_SERVICE_CLIENT,
      useValue: null satisfies IncidentWorkflowServiceClientPort | null,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class ArBffServiceModule {}
