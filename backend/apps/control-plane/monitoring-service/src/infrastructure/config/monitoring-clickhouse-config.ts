export class MonitoringClickhouseConfig {
  readonly url: string;

  readonly username: string;

  readonly password: string;

  readonly database: string;

  readonly application: string;

  readonly requestTimeoutMs: number;

  constructor(env: NodeJS.ProcessEnv) {
    this.url = env.CLICKHOUSE_URL ?? 'http://127.0.0.1:8123';
    this.username = env.CLICKHOUSE_USER ?? 'root';
    this.password = env.CLICKHOUSE_PASSWORD ?? 'password';
    this.database = env.CLICKHOUSE_DATABASE ?? 'telemetry_db';
    this.application = env.CLICKHOUSE_APPLICATION ?? 'monitoring-service';
    this.requestTimeoutMs = Number(env.CLICKHOUSE_REQUEST_TIMEOUT_MS ?? 30000);
  }
}
