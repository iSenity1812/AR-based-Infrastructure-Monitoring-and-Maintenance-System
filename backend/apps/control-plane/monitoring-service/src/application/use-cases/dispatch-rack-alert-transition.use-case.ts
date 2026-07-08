import { Inject, Injectable, Logger } from '@nestjs/common';

import { applyAlertDeliveryResultToState, mapMonitoringTransitionToAlertDeliveryCommand } from '../mappers/alert-delivery-command.mapper';
import { mapTransitionToRackMonitoringStateChangedEvent } from '../mappers/rack-monitoring-realtime-event.mapper';
import { MonitoringRealtimePort } from '../ports/monitoring-realtime.port';
import { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type {
  AlertDeliveryResult,
  MonitoringTransition,
} from '../ports/monitoring-transition';
import { AlertDeliveryPort } from '../ports/alert-delivery.port';
import { RackContextProvider } from '../ports/rack-context.provider';
import { shouldEmitRackMonitoringStateChanged } from '../policies/rack-monitoring-realtime.policy';

export interface DispatchRackAlertTransitionResult {
  action: 'sent' | 'skipped';
  attemptedAt: string | null;
  deliveryResult: AlertDeliveryResult | null;
}

@Injectable()
export class DispatchRackAlertTransitionUseCase {
  private readonly logger = new Logger(DispatchRackAlertTransitionUseCase.name);

  constructor(
    @Inject(AlertDeliveryPort)
    private readonly alertDeliveryPort: AlertDeliveryPort,
    @Inject(MonitoringStateRepository)
    private readonly monitoringStateRepository: MonitoringStateRepository,
    @Inject(MonitoringRealtimePort)
    private readonly monitoringRealtimePort: MonitoringRealtimePort,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
  ) {}

  async execute(
    transition: MonitoringTransition,
  ): Promise<DispatchRackAlertTransitionResult> {
    const command = mapMonitoringTransitionToAlertDeliveryCommand(transition);
    if (!command) {
      return {
        action: 'skipped',
        attemptedAt: null,
        deliveryResult: null,
      };
    }

    const attemptedAt = new Date().toISOString();
    const deliveryResult = await this.alertDeliveryPort.sendAlert(command);
    this.logger.log(
      `alert delivery attempted (scope=${transition.scopeType}:${transition.scopeId}, transition=${transition.transitionKind}, syncStatus=${deliveryResult.syncStatus}, deliveryStatus=${deliveryResult.deliveryStatus})`,
    );
    const nextState = applyAlertDeliveryResultToState(
      transition.nextState,
      {
        deliveredAt: deliveryResult.deliveredAt,
        syncStatus: deliveryResult.syncStatus,
      },
      attemptedAt,
    );

    await this.monitoringStateRepository.save(nextState);
    this.logger.log(
      `monitoring state saved after alert delivery (scope=${nextState.scopeType}:${nextState.scopeId}, lifecycle=${nextState.lifecycleStatus}, notificationSync=${nextState.notificationSyncStatus}, lastObservedAt=${nextState.lastObservedAt})`,
    );
    const nextTransition = {
      ...transition,
      nextState,
    };

    if (shouldEmitRackMonitoringStateChanged(nextTransition)) {
      const rackContextMap = await this.rackContextProvider.batchGetRacks([
        transition.scopeId,
      ]);
      const realtimePayload = mapTransitionToRackMonitoringStateChangedEvent(
        nextTransition,
        rackContextMap.get(transition.scopeId),
      );

      if (realtimePayload) {
        await this.monitoringRealtimePort.emitRackStateChanged(realtimePayload);
      }
    }

    return {
      action: 'sent',
      attemptedAt,
      deliveryResult,
    };
  }
}
