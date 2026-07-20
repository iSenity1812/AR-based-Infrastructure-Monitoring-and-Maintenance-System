import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MonitoringStateRepository } from '../../../application/ports/monitoring-state.repository';
import {
  MonitoringStatePersistence,
  MonitoringStateSchema,
} from './monitoring-state.schema';
import { MonitoringStateMongoRepository } from './monitoring-state-mongo.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MonitoringStatePersistence.name,
        schema: MonitoringStateSchema,
      },
    ]),
  ],
  providers: [
    MonitoringStateMongoRepository,
    {
      provide: MonitoringStateRepository,
      useExisting: MonitoringStateMongoRepository,
    },
  ],
  exports: [MonitoringStateRepository],
})
export class MonitoringStateMongoModule {}
