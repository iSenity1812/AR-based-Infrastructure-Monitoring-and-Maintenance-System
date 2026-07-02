import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IncidentWorkflowServiceConfig {
  constructor(private readonly configService: ConfigService) {}

  get mongodbUri(): string {
    return (
      this.configService.get<string>('MONGODB_URI') ??
      'mongodb://127.0.0.1:27017/incident_workflow_db'
    );
  }

  get port(): number {
    return Number(this.configService.get<string>('PORT') ?? '4003');
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

  get accessTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'change-me-access-secret'
    );
  }

  get r2AccountId(): string {
    return this.configService.get<string>('R2_ACCOUNT_ID')?.trim() ?? '';
  }

  get r2EndpointOverride(): string {
    const rawValue = this.configService.get<string>('R2_ENDPOINT')?.trim();

    if (!rawValue) {
      return '';
    }

    return rawValue.replace(/\/+$/, '');
  }

  get r2AccessKeyId(): string {
    return (
      this.configService.get<string>('R2_ACCESS_KEY_ID')?.trim() ??
      this.configService.get<string>('ACCESS_KEY_ID')?.trim() ??
      ''
    );
  }

  get r2SecretAccessKey(): string {
    return (
      this.configService.get<string>('R2_SECRET_ACCESS_KEY')?.trim() ??
      this.configService.get<string>('SECRET_ACCESS_KEY')?.trim() ??
      ''
    );
  }

  get r2BucketName(): string {
    return (
      this.configService.get<string>('R2_BUCKET_NAME')?.trim() ??
      this.configService.get<string>('R2_BUCKET')?.trim() ??
      ''
    );
  }

  get r2PublicBaseUrl(): string | undefined {
    const rawValue =
      this.configService.get<string>('R2_PUBLIC_BASE_URL')?.trim() ??
      this.configService.get<string>('R2_PUBLIC_URL')?.trim();

    if (!rawValue) {
      return undefined;
    }

    return rawValue.replace(/\/+$/, '');
  }

  get r2EvidencePrefix(): string {
    const rawValue = this.configService
      .get<string>('R2_EVIDENCE_PREFIX')
      ?.trim();

    if (!rawValue) {
      return 'tickets';
    }

    return rawValue.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  get r2PresignExpiresSeconds(): number {
    const rawValue = Number(
      this.configService.get<string>('R2_PRESIGN_EXPIRES_SECONDS') ?? '900',
    );

    if (!Number.isFinite(rawValue)) {
      return 900;
    }

    return Math.min(Math.max(Math.trunc(rawValue), 1), 604800);
  }

  get r2Endpoint(): string {
    if (this.r2EndpointOverride) {
      return this.r2EndpointOverride;
    }

    return `https://${this.r2AccountId}.r2.cloudflarestorage.com`;
  }

  get r2Configured(): boolean {
    return Boolean(
      this.r2Endpoint &&
      this.r2AccessKeyId &&
      this.r2SecretAccessKey &&
      this.r2BucketName,
    );
  }
}
