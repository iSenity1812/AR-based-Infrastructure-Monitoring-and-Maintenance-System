import { Inject, Injectable } from '@nestjs/common';

import type { MonitoringState } from '../../domain/monitoring-state';
import {
  RackContextProvider,
  type RackContextRecord,
} from '../ports/rack-context.provider';
import { MonitoringStateRepository } from '../ports/monitoring-state.repository';

export type RackMonitoringStateItemView = {
  rackId: string;
  rackName: string;
  rackCode: string;
  operational: {
    severityCode: number;
    overrideFlag: boolean;
    lifecycleStatus: MonitoringState['lifecycleStatus'];
    fingerprint: string;
    firstObservedAt: string;
    lastObservedAt: string;
    lastStateChangedAt: string;
    openedAt: string | null;
    resolvedAt: string | null;
  };
  notification: {
    syncStatus: MonitoringState['notificationSyncStatus'];
    lastNotificationAttemptAt: string | null;
    lastNotificationSyncedAt: string | null;
  };
};

export type RackMonitoringStateResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'monitoring_state';
  items: RackMonitoringStateItemView[];
};

@Injectable()
export class GetRackMonitoringStateUseCase {
  constructor(
    @Inject(MonitoringStateRepository)
    private readonly monitoringStateRepository: MonitoringStateRepository,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
  ) {}

  async execute(): Promise<RackMonitoringStateResponseView> {
    const states = await this.monitoringStateRepository.listByScopeType('rack');
    const rackIds = states.map((state) => state.scopeId);
    const rackContextMap = await this.rackContextProvider.batchGetRacks(rackIds);

    return {
      generatedAt: new Date().toISOString(),
      scope: 'rack',
      view: 'monitoring_state',
      items: states.map((state) =>
        this.toRackMonitoringStateItem(state, rackContextMap.get(state.scopeId)),
      ),
    };
  }

  private toRackMonitoringStateItem(
    state: MonitoringState,
    rackContext?: RackContextRecord,
  ): RackMonitoringStateItemView {
    return {
      rackId: state.scopeId,
      rackName: rackContext?.displayName?.trim() || state.scopeId,
      rackCode: rackContext?.rackCode || state.scopeId,
      operational: {
        severityCode: state.severityCode,
        overrideFlag: state.overrideFlag,
        lifecycleStatus: state.lifecycleStatus,
        fingerprint: state.fingerprint,
        firstObservedAt: state.firstObservedAt,
        lastObservedAt: state.lastObservedAt,
        lastStateChangedAt: state.lastStateChangedAt,
        openedAt: state.openedAt,
        resolvedAt: state.resolvedAt,
      },
      notification: {
        syncStatus: state.notificationSyncStatus,
        lastNotificationAttemptAt: state.lastNotificationAttemptAt,
        lastNotificationSyncedAt: state.lastNotificationSyncedAt,
      },
    };
  }
}
