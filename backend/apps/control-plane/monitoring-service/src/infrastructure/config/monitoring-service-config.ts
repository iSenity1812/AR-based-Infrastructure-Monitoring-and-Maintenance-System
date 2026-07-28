import type { LogLevel } from '@nestjs/common';

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

  readonly incidentWorkflowBaseUrl: string;

  readonly incidentWorkflowTimeoutMs: number;

  readonly assetServiceBaseUrl: string;

  readonly assetServiceTimeoutMs: number;

  readonly monitoringIncidentContextWindowMinutes: number;

  readonly monitoringIncidentNodeStaleThresholdSec: number;

  readonly monitoringInvestigationMaxRangeDays: number;

  readonly monitoringInvestigationMaxPoints: number;

  readonly monitoringWorkflowSystemUserId: string;

  readonly monitoringWorkflowSystemUsername: string;

  readonly monitoringWorkflowSystemFullName: string;

  readonly monitoringWorkflowSystemSessionId: string;

  readonly monitoringRackPollEnabled: boolean;

  readonly monitoringRackPollIntervalMs: number;

  readonly monitoringNodeRealtimeSyncEnabled: boolean;

  readonly monitoringNodeRealtimeSyncIntervalMs: number;

  readonly appLogLevels: LogLevel[];

  readonly externalAlertSyncSharedSecret: string;

  readonly collectorHeartbeatTimeoutSec: number;

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
    this.incidentWorkflowBaseUrl = (
      env.INCIDENT_WORKFLOW_BASE_URL ?? 'http://127.0.0.1:4004/api/v1'
    ).replace(/\/+$/, '');
    this.incidentWorkflowTimeoutMs = Number(
      env.INCIDENT_WORKFLOW_TIMEOUT_MS ?? 5000,
    );
    this.assetServiceBaseUrl = (
      env.ASSET_SERVICE_BASE_URL ?? 'http://127.0.0.1:4002/api/v1'
    ).replace(/\/+$/, '');
    this.assetServiceTimeoutMs = Number(env.ASSET_SERVICE_TIMEOUT_MS ?? 3000);
    this.monitoringIncidentContextWindowMinutes = Number(
      env.MONITORING_INCIDENT_CONTEXT_WINDOW_MINUTES ?? 30,
    );
    this.monitoringIncidentNodeStaleThresholdSec = Number(
      env.MONITORING_INCIDENT_NODE_STALE_THRESHOLD_SEC ?? 1800,
    );
    this.monitoringInvestigationMaxRangeDays = Number(
      env.MONITORING_INVESTIGATION_MAX_RANGE_DAYS ?? 7,
    );
    this.monitoringInvestigationMaxPoints = Number(
      env.MONITORING_INVESTIGATION_MAX_POINTS ?? 400,
    );
    this.monitoringWorkflowSystemUserId =
      env.MONITORING_WORKFLOW_SYSTEM_USER_ID ?? 'system-monitoring-service';
    this.monitoringWorkflowSystemUsername =
      env.MONITORING_WORKFLOW_SYSTEM_USERNAME ?? 'monitoring-service';
    this.monitoringWorkflowSystemFullName =
      env.MONITORING_WORKFLOW_SYSTEM_FULL_NAME ?? 'Monitoring Service';
    this.monitoringWorkflowSystemSessionId =
      env.MONITORING_WORKFLOW_SYSTEM_SESSION_ID ??
      'system-monitoring-service-session';
    this.monitoringRackPollEnabled =
      env.MONITORING_RACK_POLL_ENABLED === 'true';
    this.monitoringRackPollIntervalMs = Number(
      env.MONITORING_RACK_POLL_INTERVAL_MS ?? 30000,
    );
    this.monitoringNodeRealtimeSyncEnabled =
      env.MONITORING_NODE_REALTIME_SYNC_ENABLED != null
        ? env.MONITORING_NODE_REALTIME_SYNC_ENABLED === 'true'
        : this.monitoringRackPollEnabled;
    this.monitoringNodeRealtimeSyncIntervalMs = Number(
      env.MONITORING_NODE_REALTIME_SYNC_INTERVAL_MS ??
        this.monitoringRackPollIntervalMs,
    );
    this.appLogLevels = resolveAppLogLevels(this.nodeEnv, env.LOG_LEVELS);
    this.externalAlertSyncSharedSecret =
      env.MONITORING_ALERT_SYNC_SHARED_SECRET ??
      'change-me-monitoring-sync-secret';
    this.collectorHeartbeatTimeoutSec = Number(
      env.MONITORING_COLLECTOR_HEARTBEAT_TIMEOUT_SEC ?? 90,
    );
  }
}

function resolveAppLogLevels(
  nodeEnv: string,
  rawLogLevels?: string,
): LogLevel[] {
  const defaultLogLevels: LogLevel[] =
    nodeEnv === 'production'
      ? ['log', 'warn', 'error']
      : ['log', 'warn', 'error', 'debug'];

  if (!rawLogLevels) {
    return defaultLogLevels;
  }

  const parsed = rawLogLevels
    .split(',')
    .map((level) => level.trim())
    .filter((level): level is LogLevel => {
      return (
        level === 'log' ||
        level === 'error' ||
        level === 'warn' ||
        level === 'debug' ||
        level === 'verbose' ||
        level === 'fatal'
      );
    });

  return parsed.length > 0 ? parsed : defaultLogLevels;
}
