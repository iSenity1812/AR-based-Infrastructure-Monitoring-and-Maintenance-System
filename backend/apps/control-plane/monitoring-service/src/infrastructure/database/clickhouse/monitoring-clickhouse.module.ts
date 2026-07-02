import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { Module } from '@nestjs/common';

import { MonitoringClickhouseConfig } from '../../config/monitoring-clickhouse-config';
import { MonitoringClickhouseConfigModule } from '../../config/monitoring-clickhouse-config.module';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';
import { RackOverviewReadRepository } from '../../../application/ports/rack-overview-read.repository';
import { RackOverviewClickhouseRepository } from './rack-overview-clickhouse.repository';

@Module({
  imports: [MonitoringClickhouseConfigModule],
  providers: [
    {
      provide: CLICKHOUSE_CLIENT,
      inject: [MonitoringClickhouseConfig],
      useFactory: (config: MonitoringClickhouseConfig): ClickHouseClient => {
        return createClient({
          url: config.url,
          username: config.username,
          password: config.password,
          database: config.database,
          application: config.application,
          request_timeout: config.requestTimeoutMs,
        });
      },
    },
    RackOverviewClickhouseRepository,
    {
      provide: RackOverviewReadRepository,
      useExisting: RackOverviewClickhouseRepository,
    },
  ],
  exports: [CLICKHOUSE_CLIENT, RackOverviewReadRepository],
})
export class MonitoringClickhouseModule {}
