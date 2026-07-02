export class AssetServiceGrpcConfig {
  readonly host: string;

  readonly port: number;

  readonly url: string;

  constructor(env: NodeJS.ProcessEnv) {
    this.host = env.ASSET_SERVICE_GRPC_HOST ?? '0.0.0.0';
    this.port = Number(env.ASSET_SERVICE_GRPC_PORT ?? 50052);
    this.url = `${this.host}:${this.port}`;
  }
}
