import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AlertIncidentHandoffAuditRepository } from '../../../application/ports/alert-incident-handoff-audit.repository';
import {
  AlertIncidentHandoffAuditPersistence,
  AlertIncidentHandoffAuditSchema,
} from './alert-incident-handoff-audit.schema';
import { AlertIncidentHandoffAuditMongoRepository } from './alert-incident-handoff-audit-mongo.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AlertIncidentHandoffAuditPersistence.name,
        schema: AlertIncidentHandoffAuditSchema,
      },
    ]),
  ],
  providers: [
    AlertIncidentHandoffAuditMongoRepository,
    {
      provide: AlertIncidentHandoffAuditRepository,
      useExisting: AlertIncidentHandoffAuditMongoRepository,
    },
  ],
  exports: [AlertIncidentHandoffAuditRepository],
})
export class AlertIncidentHandoffAuditMongoModule {}
