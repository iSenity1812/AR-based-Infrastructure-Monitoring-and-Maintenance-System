import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { Module } from '@nestjs/common';

import { MonitoringClickhouseConfig } from '../../config/monitoring-clickhouse-config';
import { MonitoringClickhouseConfigModule } from '../../config/monitoring-clickhouse-config.module';
import { CLICKHOUSE_CLIENT } from './clickhouse.constants';
import { NodeMetricsReadRepository } from '../../../application/ports/node-metrics-read.repository';
import { NodeOverviewReadRepository } from '../../../application/ports/node-overview-read.repository';
import { RackOverviewReadRepository } from '../../../application/ports/rack-overview-read.repository';
import { NodeMetricsClickhouseRepository } from './node-metrics-clickhouse.repository';
import { NodeOverviewClickhouseRepository } from './node-overview-clickhouse.repository';
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
    NodeMetricsClickhouseRepository,
    NodeOverviewClickhouseRepository,
    RackOverviewClickhouseRepository,
    {
      provide: NodeMetricsReadRepository,
      useExisting: NodeMetricsClickhouseRepository,
    },
    {
      provide: NodeOverviewReadRepository,
      useExisting: NodeOverviewClickhouseRepository,
    },
    {
      provide: RackOverviewReadRepository,
      useExisting: RackOverviewClickhouseRepository,
    },
  ],
  exports: [
    CLICKHOUSE_CLIENT,
    NodeMetricsReadRepository,
    NodeOverviewReadRepository,
    RackOverviewReadRepository,
  ],
})
export class MonitoringClickhouseModule {}
