import { Module } from '@nestjs/common';

import { AssetServiceGrpcConfig } from './asset-service-grpc-config';

@Module({
  providers: [
    {
      provide: AssetServiceGrpcConfig,
      useFactory: () => new AssetServiceGrpcConfig(process.env),
    },
  ],
  exports: [AssetServiceGrpcConfig],
})
export class AssetServiceGrpcConfigModule {}
