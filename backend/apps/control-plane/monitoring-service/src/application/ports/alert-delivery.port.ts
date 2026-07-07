import type {
  AlertDeliveryCommand,
  AlertDeliveryResult,
} from './monitoring-transition';

export abstract class AlertDeliveryPort {
  abstract sendAlert(
    command: AlertDeliveryCommand,
  ): Promise<AlertDeliveryResult>;
}
