import { Injectable } from '@nestjs/common';

import type { AlertDeliveryPort } from '../../application/ports/alert-delivery.port';
import type {
  AlertDeliveryCommand,
  AlertDeliveryResult,
} from '../../application/ports/monitoring-transition';
import { MonitoringServiceConfig } from '../config/monitoring-service-config';

type AlertmanagerPostableAlert = {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
};

@Injectable()
export class AlertmanagerHttpAdapter implements AlertDeliveryPort {
  constructor(private readonly config: MonitoringServiceConfig) {}

  async sendAlert(
    command: AlertDeliveryCommand,
  ): Promise<AlertDeliveryResult> {
    if (!this.config.alertmanagerEnabled) {
      return {
        deliveryStatus: 'failed',
        deliveredAt: null,
        syncStatus: 'sync_failed',
        errorMessage: 'Alertmanager delivery is disabled',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.alertmanagerTimeoutMs,
    );

    try {
      const response = await fetch(
        `${this.config.alertmanagerBaseUrl}/api/v2/alerts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([mapCommandToAlertmanagerPayload(command)]),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        return {
          deliveryStatus: 'failed',
          deliveredAt: null,
          syncStatus: 'sync_failed',
          errorMessage: `Alertmanager responded with ${response.status}`,
        };
      }

      const deliveredAt = new Date().toISOString();

      return {
        deliveryStatus: 'delivered',
        deliveredAt,
        syncStatus:
          command.transitionKind === 'resolve'
            ? 'resolve_synced'
            : 'open_synced',
      };
    } catch (error) {
      return {
        deliveryStatus: 'failed',
        deliveredAt: null,
        syncStatus: 'sync_failed',
        errorMessage:
          error instanceof Error ? error.message : 'Unknown delivery error',
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function mapCommandToAlertmanagerPayload(
  command: AlertDeliveryCommand,
): AlertmanagerPostableAlert {
  const labels: Record<string, string> = {
    alertname: 'RackHealthAlert',
    scope_type: command.scopeType,
    scope_id: command.scopeId,
    scope_key: command.scopeKey,
    severity_code: String(command.severityCode),
    summary_source: command.summarySource,
    lifecycle_status: command.lifecycleStatus,
    fingerprint: command.fingerprint,
  };

  const totalNodes = command.evidence.numericIndicators.totalNodes ?? 0;
  const badNodes = command.evidence.numericIndicators.badNodes ?? 0;
  const culpritEntity = command.culprit.entityId ?? 'unknown';
  const culpritMetric = command.culprit.metricKey ?? 'unknown';
  const culpritValue =
    command.culprit.metricValueText ??
    String(command.culprit.metricValueNumeric ?? 'unknown');

  const annotations: Record<string, string> = {
    summary: `Rack ${command.scopeId} severity ${command.severityCode}`,
    description: `Worst culprit ${culpritEntity} metric ${culpritMetric} value ${culpritValue}; bad_nodes=${badNodes}/${totalNodes}`,
    culprit_entity_id: culpritEntity,
    culprit_metric_key: culpritMetric,
    culprit_metric_value: culpritValue,
    bad_nodes: String(badNodes),
    total_nodes: String(totalNodes),
    critical_nodes: String(
      command.evidence.numericIndicators.criticalNodes ?? 0,
    ),
    warning_nodes: String(command.evidence.numericIndicators.warningNodes ?? 0),
    stale_nodes: String(command.evidence.numericIndicators.staleNodes ?? 0),
    silent_dead_nodes: String(
      command.evidence.numericIndicators.silentDeadNodes ?? 0,
    ),
    bad_node_ratio: String(command.evidence.numericIndicators.badNodeRatio ?? 0),
    is_rack_level_failure: String(
      command.evidence.booleanIndicators.isRackLevelFailure ?? false,
    ),
    has_signal_loss: String(
      command.evidence.booleanIndicators.hasSignalLoss ?? false,
    ),
  };

  return {
    labels,
    annotations,
    startsAt: command.startsAt ?? undefined,
    endsAt: command.endsAt ?? undefined,
  };
}
