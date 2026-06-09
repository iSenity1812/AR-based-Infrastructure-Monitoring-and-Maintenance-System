import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AssetServiceConfig } from '@infrastructure/config/asset-service-config';
import { AssetServiceConfigModule } from '@infrastructure/config/asset-service-config.module';
import { AssetServiceModule } from '@infrastructure/di/asset-service.module';

@Module({
  imports: [
    AssetServiceConfigModule,
    CacheModule.register({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [AssetServiceConfigModule],
      inject: [AssetServiceConfig],
      useFactory: (config: AssetServiceConfig) => ({
        uri: config.mongoUri,
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
        retryAttempts: config.mongoRetryAttempts,
        retryDelay: config.mongoRetryDelayMs,
      }),
    }),
    AssetServiceModule,
  ],
})
export class AppModule {}
