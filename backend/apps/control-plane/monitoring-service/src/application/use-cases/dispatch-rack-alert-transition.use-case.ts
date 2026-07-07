import { Inject, Injectable } from '@nestjs/common';

import { applyAlertDeliveryResultToState, mapMonitoringTransitionToAlertDeliveryCommand } from '../mappers/alert-delivery-command.mapper';
import { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type {
  AlertDeliveryResult,
  MonitoringTransition,
} from '../ports/monitoring-transition';
import { AlertDeliveryPort } from '../ports/alert-delivery.port';

export interface DispatchRackAlertTransitionResult {
  action: 'sent' | 'skipped';
  attemptedAt: string | null;
  deliveryResult: AlertDeliveryResult | null;
}

@Injectable()
export class DispatchRackAlertTransitionUseCase {
  constructor(
    @Inject(AlertDeliveryPort)
    private readonly alertDeliveryPort: AlertDeliveryPort,
    @Inject(MonitoringStateRepository)
    private readonly monitoringStateRepository: MonitoringStateRepository,
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
    const nextState = applyAlertDeliveryResultToState(
      transition.nextState,
      {
        deliveredAt: deliveryResult.deliveredAt,
        syncStatus: deliveryResult.syncStatus,
      },
      attemptedAt,
    );

    await this.monitoringStateRepository.save(nextState);

    return {
      action: 'sent',
      attemptedAt,
      deliveryResult,
    };
  }
}
