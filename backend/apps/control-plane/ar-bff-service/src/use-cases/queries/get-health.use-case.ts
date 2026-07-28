import type { HealthStatusDto } from '../dto/health-status.dto';

export class GetHealthUseCase {
  execute(): HealthStatusDto {
    return {
      status: 'ok',
      service: 'ar-bff-service',
      dependencies: {
        assetService: 'configured',
        monitoringService: 'configured',
        incidentWorkflowService: 'configured',
      },
    };
  }
}
