export class MonitoringServiceConfig {
  readonly port: number;

  readonly apiPrefix: string;

  readonly corsOrigin: string;

  readonly nodeEnv: string;

  readonly accessTokenSecret: string;

  readonly mongoUri: string;

  readonly mongoServerSelectionTimeoutMs: number;

  readonly mongoRetryAttempts: number;

  readonly mongoRetryDelayMs: number;

  readonly mongoLazyConnection: boolean;

  readonly redisUri: string;

  readonly swaggerEnabled: boolean;

  constructor(env: NodeJS.ProcessEnv) {
    this.port = Number(env.PORT ?? 4003);
    this.apiPrefix = env.API_PREFIX ?? 'api/v1';
    this.corsOrigin = env.CORS_ORIGIN ?? '*';
    this.nodeEnv = env.NODE_ENV ?? 'development';
    this.accessTokenSecret =
      env.JWT_ACCESS_SECRET ??
      env.ACCESS_TOKEN_SECRET ??
      'change-me-access-secret';
    this.mongoUri =
      env.MONITORING_MONGODB_URI ??
      env.MONGO_URI ??
      'mongodb://127.0.0.1:27017/monitoring_context_db';
    this.mongoServerSelectionTimeoutMs = Number(
      env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000,
    );
    this.mongoRetryAttempts = Number(env.MONGO_RETRY_ATTEMPTS ?? 5);
    this.mongoRetryDelayMs = Number(env.MONGO_RETRY_DELAY_MS ?? 3000);
    this.mongoLazyConnection = env.MONGO_LAZY_CONNECTION !== 'false';
    this.redisUri = env.REDIS_URL ?? 'redis://127.0.0.1:6379/0';
    this.swaggerEnabled = env.SWAGGER_ENABLED === 'true';
  }
}
