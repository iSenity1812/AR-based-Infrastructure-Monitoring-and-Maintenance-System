export interface HealthStatusDto {
  status: 'ok';
  service: 'ar-bff-service';
  dependencies: {
    assetService: 'configured';
    monitoringService: 'configured';
    incidentWorkflowService: 'configured';
  };
}
