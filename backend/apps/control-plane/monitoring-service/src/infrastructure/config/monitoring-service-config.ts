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

  readonly alertmanagerEnabled: boolean;

  readonly alertmanagerBaseUrl: string;

  readonly alertmanagerTimeoutMs: number;

  readonly monitoringRackPollEnabled: boolean;

  readonly monitoringRackPollIntervalMs: number;

  readonly externalAlertSyncSharedSecret: string;

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
      'mongodb://127.0.0.1:27017/monitoring_db';
    this.mongoServerSelectionTimeoutMs = Number(
      env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? 5000,
    );
    this.mongoRetryAttempts = Number(env.MONGO_RETRY_ATTEMPTS ?? 5);
    this.mongoRetryDelayMs = Number(env.MONGO_RETRY_DELAY_MS ?? 3000);
    this.mongoLazyConnection = env.MONGO_LAZY_CONNECTION !== 'false';
    this.redisUri = env.REDIS_URL ?? 'redis://127.0.0.1:6379/0';
    this.swaggerEnabled = env.SWAGGER_ENABLED === 'true';
    this.alertmanagerEnabled = env.ALERTMANAGER_ENABLED === 'true';
    this.alertmanagerBaseUrl =
      env.ALERTMANAGER_BASE_URL ?? 'http://127.0.0.1:9093';
    this.alertmanagerTimeoutMs = Number(env.ALERTMANAGER_TIMEOUT_MS ?? 5000);
    this.monitoringRackPollEnabled =
      env.MONITORING_RACK_POLL_ENABLED === 'true';
    this.monitoringRackPollIntervalMs = Number(
      env.MONITORING_RACK_POLL_INTERVAL_MS ?? 30000,
    );
    this.externalAlertSyncSharedSecret =
      env.MONITORING_ALERT_SYNC_SHARED_SECRET ??
      'change-me-monitoring-sync-secret';
  }
}
