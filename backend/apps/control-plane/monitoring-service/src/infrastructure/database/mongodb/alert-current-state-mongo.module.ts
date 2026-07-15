import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AlertCurrentStateRepository } from '../../../application/ports/alert-current-state.repository';
import {
  AlertCurrentStatePersistence,
  AlertCurrentStateSchema,
} from './alert-current-state.schema';
import { AlertCurrentStateMongoRepository } from './alert-current-state-mongo.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AlertCurrentStatePersistence.name,
        schema: AlertCurrentStateSchema,
      },
    ]),
  ],
  providers: [
    AlertCurrentStateMongoRepository,
    {
      provide: AlertCurrentStateRepository,
      useExisting: AlertCurrentStateMongoRepository,
    },
  ],
  exports: [AlertCurrentStateRepository],
})
export class AlertCurrentStateMongoModule {}
