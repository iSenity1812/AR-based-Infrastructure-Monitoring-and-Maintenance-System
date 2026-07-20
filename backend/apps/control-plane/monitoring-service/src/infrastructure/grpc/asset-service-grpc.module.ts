import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';

import { RackContextProvider } from '../../application/ports/rack-context.provider';
import { AssetServiceGrpcConfig } from '../config/asset-service-grpc-config';
import { AssetServiceGrpcConfigModule } from '../config/asset-service-grpc-config.module';
import { AssetRackContextGrpcProvider } from './asset-rack-context-grpc.provider';

@Module({
  imports: [
    AssetServiceGrpcConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'ASSET_SERVICE_GRPC',
        imports: [AssetServiceGrpcConfigModule],
        inject: [AssetServiceGrpcConfig],
        useFactory: (config: AssetServiceGrpcConfig) => ({
          transport: Transport.GRPC,
          options: {
            url: config.url,
            package: 'asset_context.v1',
            protoPath: resolveRackContextProtoPath(),
          },
        }),
      },
    ]),
  ],
  providers: [
    AssetRackContextGrpcProvider,
    {
      provide: RackContextProvider,
      useExisting: AssetRackContextGrpcProvider,
    },
  ],
  exports: [RackContextProvider],
})
export class AssetServiceGrpcModule {}

function resolveRackContextProtoPath(): string {
  const localSourceProtoPath = join(
    process.cwd(),
    'src',
    'infrastructure',
    'grpc',
    'proto',
    'rack-context.proto',
  );
  if (existsSync(localSourceProtoPath)) {
    return localSourceProtoPath;
  }

  return join(
    process.cwd(),
    '..',
    'asset-service',
    'src',
    'infrastructure',
    'grpc',
    'proto',
    'rack-context.proto',
  );
}
