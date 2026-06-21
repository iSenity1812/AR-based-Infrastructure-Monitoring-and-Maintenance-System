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

  private parseNumber(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}
