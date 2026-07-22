import { Inject, Injectable } from '@nestjs/common';

import {
  CollectorLivenessRepository,
  type CollectorHeartbeatRecord,
} from '../ports/collector-liveness.repository';

export interface SyncCollectorHeartbeatCommand {
  nodeId: string;
  agentId: string | null;
  observedAt: string;
  source: string | null;
  metricKey: string | null;
  sourceMetric: string | null;
}

export interface SyncCollectorHeartbeatResult {
  nodeId: string;
  synced: boolean;
  lastHeartbeatAt: string;
}

@Injectable()
export class SyncCollectorHeartbeatUseCase {
  constructor(
    @Inject(CollectorLivenessRepository)
    private readonly collectorLivenessRepository: CollectorLivenessRepository,
  ) {}

  async execute(
    command: SyncCollectorHeartbeatCommand,
  ): Promise<SyncCollectorHeartbeatResult> {
    const normalized = normalizeCommand(command);
    const saved = await this.collectorLivenessRepository.upsertHeartbeat(
      normalized,
    );

    return {
      nodeId: saved.nodeId,
      synced: true,
      lastHeartbeatAt: saved.lastHeartbeatAt,
    };
  }
}

function normalizeCommand(
  command: SyncCollectorHeartbeatCommand,
): CollectorHeartbeatRecord {
  return {
    nodeId: command.nodeId.trim(),
    agentId: normalizeOptional(command.agentId),
    lastHeartbeatAt: new Date(command.observedAt).toISOString(),
    source: normalizeOptional(command.source),
    metricKey: normalizeOptional(command.metricKey),
    sourceMetric: normalizeOptional(command.sourceMetric),
  };
}

function normalizeOptional(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
