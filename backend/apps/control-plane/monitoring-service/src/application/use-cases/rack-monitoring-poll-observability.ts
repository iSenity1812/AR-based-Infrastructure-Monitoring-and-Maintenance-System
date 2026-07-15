import type { PollRackMonitoringInput, PollRackMonitoringResult } from './poll-rack-monitoring.use-case';

export type RackMonitoringPollTrigger = 'manual' | 'scheduled';

export function formatRackMonitoringPollStartMessage(
  trigger: RackMonitoringPollTrigger,
  input: PollRackMonitoringInput,
): string {
  const mode = input.changedSinceSummaryTs ? 'incremental' : 'full';
  const checkpoint = input.changedSinceSummaryTs ?? 'none';

  return `rack poll started (trigger=${trigger}, mode=${mode}, checkpoint=${checkpoint})`;
}

export function formatRackMonitoringPollCompletedMessage(
  trigger: RackMonitoringPollTrigger,
  elapsedMs: number,
  result: PollRackMonitoringResult,
): string {
  const affectedRackCount = new Set(
    result.transitions.map((transition) => transition.scopeId),
  ).size;

  return `rack poll completed (trigger=${trigger}, durationMs=${elapsedMs}, processedRows=${result.processedRows}, skippedRows=${result.skippedRows}, transitions=${result.transitions.length}, affectedRacks=${affectedRackCount}, nextCheckpoint=${result.nextCheckpointSummaryTs ?? 'none'})`;
}

export function formatRackMonitoringPollFailedMessage(
  trigger: RackMonitoringPollTrigger,
  input: PollRackMonitoringInput,
  error: unknown,
): string {
  const checkpoint = input.changedSinceSummaryTs ?? 'none';
  const message = error instanceof Error ? error.message : String(error);

  return `rack poll failed (trigger=${trigger}, checkpoint=${checkpoint}, error=${message})`;
}
