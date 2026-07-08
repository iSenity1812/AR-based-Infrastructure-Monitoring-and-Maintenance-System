import { Inject, Injectable, Logger } from '@nestjs/common';

import type { MonitoringState } from '../../domain/monitoring-state';
import { evaluateSummaryRuleInput } from '../../domain/summary-rule';
import { mapRackOverviewRecordToSummaryRuleInput } from '../mappers/rack-summary-rule.mapper';
import { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type { MonitoringTransition } from '../ports/monitoring-transition';
import { RackOverviewReadRepository } from '../ports/rack-overview-read.repository';
import { DispatchRackAlertTransitionUseCase } from './dispatch-rack-alert-transition.use-case';

export interface PollRackMonitoringInput {
  /**
   * Phase-1 checkpoint strategy:
   * - omitted => full poll, primarily for first-run bootstrap and manual debugging
   * - provided => incremental poll since the given summary timestamp
   *
   * This checkpoint is caller-scoped optimization input only. Transition
   * correctness still comes from persisted monitoring state + fingerprint logic,
   * not from checkpoint continuity.
   */
  changedSinceSummaryTs?: string;
}

export interface PollRackMonitoringResult {
  transitions: MonitoringTransition[];
  processedRows: number;
  skippedRows: number;
  nextCheckpointSummaryTs: string | null;
}

@Injectable()
export class PollRackMonitoringUseCase {
  private readonly logger = new Logger(PollRackMonitoringUseCase.name);

  constructor(
    @Inject(RackOverviewReadRepository)
    private readonly rackOverviewReadRepository: RackOverviewReadRepository,
    @Inject(MonitoringStateRepository)
    private readonly monitoringStateRepository: MonitoringStateRepository,
    private readonly dispatchRackAlertTransitionUseCase: DispatchRackAlertTransitionUseCase,
  ) {}

  async execute(
    input: PollRackMonitoringInput = {},
  ): Promise<PollRackMonitoringResult> {
    const startedAt = Date.now();
    const rackRows = input.changedSinceSummaryTs
      ? await this.rackOverviewReadRepository.listCurrentRacksChangedSince(
          input.changedSinceSummaryTs,
        )
      : await this.rackOverviewReadRepository.listCurrentRacks();

    this.logger.log(
      `rack poll query completed (checkpoint=${input.changedSinceSummaryTs ?? 'none'}, fetchedRows=${rackRows.length})`,
    );

    const transitions: MonitoringTransition[] = [];
    let processedRows = 0;
    let skippedRows = 0;
    let nextCheckpointSummaryTs: string | null = null;

    for (const row of rackRows) {
      nextCheckpointSummaryTs = maxTimestamp(nextCheckpointSummaryTs, row.summaryTs);

      const summaryInput = mapRackOverviewRecordToSummaryRuleInput(row);
      if (!summaryInput) {
        skippedRows += 1;
        continue;
      }

      processedRows += 1;

      const evaluation = evaluateSummaryRuleInput(summaryInput);
      const previousState = await this.monitoringStateRepository.findByScope(
        evaluation.scopeType,
        evaluation.scopeId,
      );

      const transition = buildMonitoringTransition(evaluation, previousState);
      if (shouldDispatchTransition(transition)) {
        await this.dispatchRackAlertTransitionUseCase.execute(transition);
      } else if (shouldPersistTransition(transition)) {
        await this.monitoringStateRepository.save(transition.nextState);
      }

      transitions.push(transition);
    }

    this.logger.log(
      `rack poll evaluated (checkpoint=${input.changedSinceSummaryTs ?? 'none'}, processedRows=${processedRows}, skippedRows=${skippedRows}, transitions=${transitions.length}, nextCheckpoint=${nextCheckpointSummaryTs ?? 'none'}, durationMs=${Date.now() - startedAt})`,
    );

    return {
      transitions,
      processedRows,
      skippedRows,
      nextCheckpointSummaryTs,
    };
  }
}

type RackMonitoringEvaluation = ReturnType<typeof evaluateSummaryRuleInput>;

export function buildMonitoringTransition(
  evaluation: RackMonitoringEvaluation,
  previousState: MonitoringState | null,
): MonitoringTransition {
  const nextState = buildNextState(evaluation, previousState);

  return {
    transitionKind: deriveTransitionKind(evaluation, previousState),
    summarySource: evaluation.summarySource,
    scopeType: evaluation.scopeType,
    scopeId: evaluation.scopeId,
    scopeKey: evaluation.scopeKey,
    observedAt: evaluation.observedAt,
    severityCode: evaluation.severityCode,
    overrideFlag: evaluation.overrideFlag,
    lifecycleStatus: nextState.lifecycleStatus,
    candidateIntent: evaluation.candidateIntent,
    fingerprint: nextState.fingerprint,
    culprit: evaluation.culprit,
    evidence: evaluation.evidence,
    previousState,
    nextState,
  };
}

function deriveTransitionKind(
  evaluation: RackMonitoringEvaluation,
  previousState: MonitoringState | null,
): MonitoringTransition['transitionKind'] {
  if (!previousState) {
    return evaluation.candidateState.lifecycleStatus === 'active'
      ? 'activate'
      : 'noop';
  }

  if (previousState.lifecycleStatus === 'active') {
    if (evaluation.candidateState.lifecycleStatus === 'resolved') {
      return 'resolve';
    }

    if (
      previousState.fingerprint === evaluation.fingerprint &&
      previousState.severityCode === evaluation.severityCode
    ) {
      return 'repeated_active';
    }

    return 'activate';
  }

  if (evaluation.candidateState.lifecycleStatus === 'active') {
    return 'activate';
  }

  return 'noop';
}

function buildNextState(
  evaluation: RackMonitoringEvaluation,
  previousState: MonitoringState | null,
): MonitoringState {
  if (!previousState) {
    return evaluation.candidateState;
  }

  if (previousState.lifecycleStatus === 'active') {
    if (evaluation.candidateState.lifecycleStatus === 'resolved') {
      return {
        ...previousState,
        fingerprint: evaluation.fingerprint,
        severityCode: evaluation.severityCode,
        overrideFlag: evaluation.overrideFlag,
        lifecycleStatus: 'resolved',
        notificationSyncStatus: 'pending_resolve',
        lastObservedAt: evaluation.observedAt,
        lastStateChangedAt: evaluation.observedAt,
        resolvedAt: evaluation.observedAt,
      };
    }

    if (
      previousState.fingerprint === evaluation.fingerprint &&
      previousState.severityCode === evaluation.severityCode
    ) {
      return {
        ...previousState,
        lastObservedAt: evaluation.observedAt,
        severityCode: evaluation.severityCode,
        overrideFlag: evaluation.overrideFlag,
      };
    }
  }

  return evaluation.candidateState;
}

function maxTimestamp(current: string | null, candidate: string): string {
  if (!current) {
    return candidate;
  }

  return candidate > current ? candidate : current;
}

function shouldDispatchTransition(transition: MonitoringTransition): boolean {
  return (
    transition.transitionKind === 'activate' ||
    transition.transitionKind === 'resolve'
  );
}

function shouldPersistTransition(transition: MonitoringTransition): boolean {
  return transition.transitionKind === 'repeated_active';
}
