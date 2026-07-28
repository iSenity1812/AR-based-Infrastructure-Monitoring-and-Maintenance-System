import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ArBffServiceConfig {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? '4010');
  }

  get apiPrefix(): string {
    const rawPrefix = this.configService.get<string>('API_PREFIX') ?? 'api/v1';
    return rawPrefix.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  get swaggerEnabled(): boolean {
    return (
      (this.configService.get<string>('SWAGGER_ENABLED') ?? 'true') !== 'false'
    );
  }

  get corsOrigin(): string {
    return (
      this.configService.get<string>('CORS_ORIGIN') ??
      'http://localhost:8083,http://127.0.0.1:8083,http://localhost:19006,http://127.0.0.1:19006'
    );
  }

  get accessTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'change-me-access-secret'
    );
  }

  get assetServiceBaseUrl(): string {
    return this.normalizeBaseUrl(
      this.configService.get<string>('ASSET_SERVICE_BASE_URL') ??
        'http://localhost:4001/api/v1',
    );
  }

  get monitoringServiceBaseUrl(): string {
    return this.normalizeBaseUrl(
      this.configService.get<string>('MONITORING_SERVICE_BASE_URL') ??
        'http://localhost:4002/api/v1',
    );
  }

  get incidentWorkflowServiceBaseUrl(): string {
    return this.normalizeBaseUrl(
      this.configService.get<string>('INCIDENT_WORKFLOW_SERVICE_BASE_URL') ??
        'http://localhost:4003/api/v1',
    );
  }

  private normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
