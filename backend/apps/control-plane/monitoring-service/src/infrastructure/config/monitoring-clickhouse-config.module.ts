import { Module } from '@nestjs/common';
import { MonitoringClickhouseConfig } from './monitoring-clickhouse-config';

@Module({
  providers: [
    {
      provide: MonitoringClickhouseConfig,
      useFactory: () => new MonitoringClickhouseConfig(process.env),
    },
  ],
  exports: [MonitoringClickhouseConfig],
})
export class MonitoringClickhouseConfigModule {}
