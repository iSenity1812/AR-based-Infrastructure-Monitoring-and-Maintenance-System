import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CollectorLivenessRepository } from '../../../application/ports/collector-liveness.repository';
import {
  CollectorLivenessPersistence,
  CollectorLivenessSchema,
} from './collector-liveness.schema';
import { CollectorLivenessMongoRepository } from './collector-liveness-mongo.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CollectorLivenessPersistence.name,
        schema: CollectorLivenessSchema,
      },
    ]),
  ],
  providers: [
    CollectorLivenessMongoRepository,
    {
      provide: CollectorLivenessRepository,
      useExisting: CollectorLivenessMongoRepository,
    },
  ],
  exports: [CollectorLivenessRepository],
})
export class CollectorLivenessMongoModule {}
