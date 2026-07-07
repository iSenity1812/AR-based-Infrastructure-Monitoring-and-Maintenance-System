import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

import {
  buildMonitoringScopeKey,
  type MonitoringScopeType,
  type MonitoringState,
} from '../../../domain/monitoring-state';
import { MonitoringStateRepository } from '../../../application/ports/monitoring-state.repository';
import {
  MonitoringStatePersistence,
  type MonitoringStateDocument,
} from './monitoring-state.schema';

@Injectable()
export class MonitoringStateMongoRepository
  implements MonitoringStateRepository
{
  constructor(
    @InjectModel(MonitoringStatePersistence.name)
    private readonly monitoringStateModel: Model<MonitoringStateDocument>,
  ) {}

  async findByScope(
    scopeType: MonitoringScopeType,
    scopeId: string,
  ): Promise<MonitoringState | null> {
    const document = await this.monitoringStateModel
      .findOne({
        scopeKey: buildMonitoringScopeKey(scopeType, scopeId),
      })
      .lean<MonitoringStatePersistence | null>()
      .exec();

    return document ? mapDocumentToMonitoringState(document) : null;
  }

  async save(state: MonitoringState): Promise<void> {
    const persistence = mapMonitoringStateToPersistence(state);

    await this.monitoringStateModel
      .updateOne(
        { scopeKey: state.scopeKey },
        {
          $set: persistence,
        },
        { upsert: true },
      )
      .exec();
  }
}

export function mapMonitoringStateToPersistence(
  state: MonitoringState,
): MonitoringStatePersistence {
  return {
    scopeType: state.scopeType,
    scopeId: state.scopeId,
    scopeKey: state.scopeKey,
    fingerprint: state.fingerprint,
    severityCode: state.severityCode,
    overrideFlag: state.overrideFlag,
    lifecycleStatus: state.lifecycleStatus,
    notificationSyncStatus: state.notificationSyncStatus,
    firstObservedAt: state.firstObservedAt,
    lastObservedAt: state.lastObservedAt,
    lastStateChangedAt: state.lastStateChangedAt,
    openedAt: state.openedAt,
    resolvedAt: state.resolvedAt,
    lastNotificationAttemptAt: state.lastNotificationAttemptAt,
    lastNotificationSyncedAt: state.lastNotificationSyncedAt,
  };
}

export function mapDocumentToMonitoringState(
  document: MonitoringStatePersistence,
): MonitoringState {
  return {
    scopeType: document.scopeType,
    scopeId: document.scopeId,
    scopeKey: document.scopeKey,
    fingerprint: document.fingerprint,
    severityCode: document.severityCode,
    overrideFlag: document.overrideFlag,
    lifecycleStatus: document.lifecycleStatus,
    notificationSyncStatus: document.notificationSyncStatus,
    firstObservedAt: document.firstObservedAt,
    lastObservedAt: document.lastObservedAt,
    lastStateChangedAt: document.lastStateChangedAt,
    openedAt: document.openedAt ?? null,
    resolvedAt: document.resolvedAt ?? null,
    lastNotificationAttemptAt: document.lastNotificationAttemptAt ?? null,
    lastNotificationSyncedAt: document.lastNotificationSyncedAt ?? null,
  };
}
