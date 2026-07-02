import { Injectable } from '@nestjs/common';

@Injectable()
export class AssetServiceConfig {
  get mongoUri(): string {
    return (
      process.env.ASSET_MONGODB_URI ??
      process.env.MONGODB_URI ??
      'mongodb://127.0.0.1:27017/asset_db'
    );
  }

  get redisUrl(): string {
    return process.env.ASSET_REDIS_URL ?? 'redis://127.0.0.1:6379/0';
  }

  get kafkaBrokers(): string[] {
    return this.parseList(process.env.ASSET_KAFKA_BROKERS, ['localhost:19092']);
  }

  get kafkaClientId(): string {
    return process.env.ASSET_KAFKA_CLIENT_ID ?? 'asset-service';
  }

  get assetNodeMappingTopic(): string {
    return process.env.ASSET_NODE_MAPPING_TOPIC ?? 'asset.node.mapping';
  }

  get accessTokenSecret(): string {
    return (
      process.env.JWT_ACCESS_SECRET ??
      process.env.ACCESS_TOKEN_SECRET ??
      'change-me-access-secret'
    );
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  }

  get port(): number {
    const rawPort = process.env.PORT ?? '4002';
    const port = Number.parseInt(rawPort, 10);
    return Number.isNaN(port) ? 4002 : port;
  }

  get grpcHost(): string {
    return process.env.ASSET_GRPC_HOST ?? '0.0.0.0';
  }

  get grpcPort(): number {
    const rawPort = process.env.ASSET_GRPC_PORT ?? '50052';
    const port = Number.parseInt(rawPort, 10);
    return Number.isNaN(port) ? 50052 : port;
  }

  get grpcUrl(): string {
    return `${this.grpcHost}:${this.grpcPort}`;
  }

  get swaggerEnabled(): boolean {
    return (process.env.SWAGGER_ENABLED ?? 'true').toLowerCase() !== 'false';
  }

  get mongoServerSelectionTimeoutMs(): number {
    return this.parseNumber(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      5000,
    );
  }

  get mongoRetryAttempts(): number {
    return this.parseNumber(process.env.MONGODB_RETRY_ATTEMPTS, 1);
  }

  get mongoRetryDelayMs(): number {
    return this.parseNumber(process.env.MONGODB_RETRY_DELAY_MS, 1000);
  }

  get corsOrigin(): string {
    return this.corsOrigins[0] ?? 'http://localhost:3000';
  }

  get corsOrigins(): string[] {
    return this.parseList(process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN, [
      'http://localhost:4002',
      'http://localhost:3000',
    ]);
  }

  get corsEnabled(): boolean {
    return (process.env.CORS_ENABLED ?? 'true').toLowerCase() !== 'false';
  }

  get corsMethods(): string[] {
    return this.parseList(process.env.CORS_METHODS, [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
  }

  get publicApiBasePath(): string {
    return process.env.PUBLIC_API_BASE_PATH ?? '';
  }

  get apiPrefix(): string {
    return process.env.API_PREFIX ?? 'api/v1';
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private parseList(value: string | undefined, fallback: string[]): string[] {
    if (!value) {
      return fallback;
    }

    const parsed = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return parsed.length > 0 ? parsed : fallback;
  }
}
