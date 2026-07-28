import { Module } from '@nestjs/common';
import { MonitoringServiceConfig } from './monitoring-service-config';

@Module({
  providers: [
    {
      provide: MonitoringServiceConfig,
      useFactory: () => new MonitoringServiceConfig(process.env),
    },
  ],
  exports: [MonitoringServiceConfig],
})
export class MonitoringServiceConfigModule {}
