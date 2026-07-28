import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AlertIncidentHandoffAuditRepository,
  type AlertIncidentHandoffAuditRecord,
} from '../../../application/ports/alert-incident-handoff-audit.repository';
import {
  AlertIncidentHandoffAuditPersistence,
  type AlertIncidentHandoffAuditDocument,
} from './alert-incident-handoff-audit.schema';

@Injectable()
export class AlertIncidentHandoffAuditMongoRepository
  implements AlertIncidentHandoffAuditRepository
{
  constructor(
    @InjectModel(AlertIncidentHandoffAuditPersistence.name)
    private readonly alertIncidentHandoffAuditModel: Model<AlertIncidentHandoffAuditDocument>,
  ) {}

  async append(record: AlertIncidentHandoffAuditRecord): Promise<void> {
    await this.alertIncidentHandoffAuditModel.create(record);
  }
}
