import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';

import { ArBffServiceConfig } from '@infrastructure/config/ar-bff-service-config';
import {
  ASSET_SERVICE_CLIENT,
  INCIDENT_WORKFLOW_SERVICE_CLIENT,
  MONITORING_SERVICE_CLIENT,
} from '@application/ports/client.tokens';
import { AssetServiceHttpClient } from '@infrastructure/http/asset-service-http.client';
import { IncidentWorkflowServiceHttpClient } from '@infrastructure/http/incident-workflow-service-http.client';
import { MonitoringServiceHttpClient } from '@infrastructure/http/monitoring-service-http.client';
import { ArAssetsController } from '@presentation/http/controllers/ar-assets.controller';
import { ArOverlayController } from '@presentation/http/controllers/ar-overlay.controller';
import { HealthController } from '@presentation/http/controllers/health.controller';
import { MarkerScanController } from '@presentation/http/controllers/marker-scan.controller';
import { ApiResponseInterceptor } from '@presentation/http/interceptors/api-response.interceptor';
import { JwtAuthGuard } from '@presentation/http/guards/jwt-auth.guard';
import { PermissionsGuard } from '@presentation/http/guards/permissions.guard';
import { JwtStrategy } from '@presentation/http/strategies/jwt.strategy';
import { GetHealthUseCase } from '@use-cases/queries/get-health.use-case';
import { CreateArWorkOrderUseCase } from '@use-cases/queries/create-ar-work-order.use-case';
import { GetArAssetOverviewUseCase } from '@use-cases/queries/get-ar-asset-overview.use-case';
import { GetArOverlayUseCase } from '@use-cases/queries/get-ar-overlay.use-case';
import { ListArWorkOrdersUseCase } from '@use-cases/queries/list-ar-work-orders.use-case';
import { ScanMarkerUseCase } from '@use-cases/queries/scan-marker.use-case';
import {
  CREATE_AR_WORK_ORDER_USE_CASE,
  GET_AR_ASSET_OVERVIEW_USE_CASE,
  GET_AR_OVERLAY_USE_CASE,
  GET_HEALTH_USE_CASE,
  LIST_AR_WORK_ORDERS_USE_CASE,
  SCAN_MARKER_USE_CASE,
} from './use-case.tokens';

@Module({
  imports: [PassportModule],
  controllers: [
    HealthController,
    MarkerScanController,
    ArAssetsController,
    ArOverlayController,
  ],
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
      provide: GET_AR_ASSET_OVERVIEW_USE_CASE,
      useClass: GetArAssetOverviewUseCase,
    },
    {
      provide: GET_AR_OVERLAY_USE_CASE,
      useClass: GetArOverlayUseCase,
    },
    {
      provide: LIST_AR_WORK_ORDERS_USE_CASE,
      useClass: ListArWorkOrdersUseCase,
    },
    {
      provide: CREATE_AR_WORK_ORDER_USE_CASE,
      useClass: CreateArWorkOrderUseCase,
    },
    {
      provide: ASSET_SERVICE_CLIENT,
      useClass: AssetServiceHttpClient,
    },
    {
      provide: MONITORING_SERVICE_CLIENT,
      useClass: MonitoringServiceHttpClient,
    },
    {
      provide: INCIDENT_WORKFLOW_SERVICE_CLIENT,
      useClass: IncidentWorkflowServiceHttpClient,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class ArBffServiceModule {}
