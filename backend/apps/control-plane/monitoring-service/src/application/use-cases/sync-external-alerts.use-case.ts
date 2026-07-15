import { Inject, Injectable, Logger } from '@nestjs/common';

import { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import type { AlertCurrentState } from '../../domain/alert-current-state';
import {
  mapExternalAlertToCurrentState,
  type SyncExternalAlertsCommand,
} from '../mappers/external-alert-sync.mapper';

export interface SyncExternalAlertItemResult {
  kind: 'synced' | 'invalid' | 'skipped';
  fingerprint: string | null;
  action?: 'created' | 'updated' | 'resolved' | 'noop';
  reason?: string;
}

export interface SyncExternalAlertsUseCaseResult {
  totalReceived: number;
  synced: number;
  invalid: number;
  skipped: number;
  results: SyncExternalAlertItemResult[];
}

@Injectable()
export class SyncExternalAlertsUseCase {
  private readonly logger = new Logger(SyncExternalAlertsUseCase.name);

  constructor(
    @Inject(AlertCurrentStateRepository)
    private readonly alertCurrentStateRepository: AlertCurrentStateRepository,
  ) {}

  async execute(
    input: SyncExternalAlertsCommand,
  ): Promise<SyncExternalAlertsUseCaseResult> {
    const results: SyncExternalAlertItemResult[] = [];

    for (const alert of input.alerts) {
      const mapped = mapExternalAlertToCurrentState({
        receivedAt: input.receivedAt,
        alert,
        commonLabels: input.commonLabels,
        commonAnnotations: input.commonAnnotations,
      });

      if (mapped.kind === 'invalid') {
        this.logger.warn(
          `external alert sync invalid (fingerprint=${mapped.metadata.fingerprint ?? 'unknown'}, alertName=${mapped.metadata.alertName ?? 'unknown'}, scopeType=${mapped.metadata.scopeType ?? 'unknown'}, reason=${mapped.reason})`,
        );
        results.push({
          kind: 'invalid',
          fingerprint: mapped.metadata.fingerprint,
          reason: mapped.reason,
        });
        continue;
      }

      const previous =
        await this.alertCurrentStateRepository.findByFingerprint(
          mapped.state.fingerprint,
        );

      const nextState = buildNextAlertCurrentState(mapped.state, previous);
      await this.alertCurrentStateRepository.upsert(nextState);

      const action = resolveSyncAction(previous, nextState);
      this.logger.log(
        `external alert synced (fingerprint=${nextState.fingerprint}, alertName=${nextState.alertName}, scopeType=${nextState.scopeType}, status=${nextState.status}, action=${action})`,
      );
      results.push({
        kind: 'synced',
        fingerprint: nextState.fingerprint,
        action,
      });
    }

    return {
      totalReceived: input.alerts.length,
      synced: results.filter((result) => result.kind === 'synced').length,
      invalid: results.filter((result) => result.kind === 'invalid').length,
      skipped: results.filter((result) => result.kind === 'skipped').length,
      results,
    };
  }
}

function buildNextAlertCurrentState(
  incoming: AlertCurrentState,
  previous: AlertCurrentState | null,
): AlertCurrentState {
  if (!previous) {
    return incoming;
  }

  return {
    ...incoming,
    firstSyncedAt: previous.firstSyncedAt,
    lastStatusChangedAt:
      previous.status === incoming.status
        ? previous.lastStatusChangedAt
        : incoming.lastStatusChangedAt,
  };
}

function resolveSyncAction(
  previous: AlertCurrentState | null,
  next: AlertCurrentState,
): 'created' | 'updated' | 'resolved' | 'noop' {
  if (!previous) {
    return 'created';
  }

  if (previous.status !== next.status && next.status === 'resolved') {
    return 'resolved';
  }

  return 'updated';
}
