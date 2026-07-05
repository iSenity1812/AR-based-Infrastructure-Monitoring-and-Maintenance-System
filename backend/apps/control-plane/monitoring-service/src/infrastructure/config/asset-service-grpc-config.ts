export class AssetServiceGrpcConfig {
  readonly host: string;

  readonly port: number;

  readonly url: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.host = env.ASSET_SERVICE_GRPC_HOST ?? '127.0.0.1';
    this.port = Number(env.ASSET_SERVICE_GRPC_PORT ?? 50052);
    this.url = `${this.host}:${this.port}`;
  }
}
