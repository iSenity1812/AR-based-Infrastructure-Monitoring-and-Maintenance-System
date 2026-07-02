import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MonitoringServiceConfig } from '../config/monitoring-service-config';
import { MonitoringServiceConfigModule } from '../config/monitoring-service-config.module';

@Module({
  imports: [
    MonitoringServiceConfigModule,
    MongooseModule.forRootAsync({
      imports: [MonitoringServiceConfigModule],
      inject: [MonitoringServiceConfig],
      useFactory: (config: MonitoringServiceConfig) => ({
        uri: config.mongoUri,
        serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
        retryAttempts: config.mongoRetryAttempts,
        retryDelay: config.mongoRetryDelayMs,
        lazyConnection: config.mongoLazyConnection,
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MonitoringDatabaseModule {}
