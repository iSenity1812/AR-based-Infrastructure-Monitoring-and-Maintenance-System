import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MonitoringEventRepository } from '../../../application/ports/monitoring-event.repository';
import {
  MonitoringEventPersistence,
  MonitoringEventSchema,
} from './monitoring-event.schema';
import { MonitoringEventMongoRepository } from './monitoring-event-mongo.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MonitoringEventPersistence.name,
        schema: MonitoringEventSchema,
      },
    ]),
  ],
  providers: [
    MonitoringEventMongoRepository,
    {
      provide: MonitoringEventRepository,
      useExisting: MonitoringEventMongoRepository,
    },
  ],
  exports: [MonitoringEventRepository],
})
export class MonitoringEventMongoModule {}
