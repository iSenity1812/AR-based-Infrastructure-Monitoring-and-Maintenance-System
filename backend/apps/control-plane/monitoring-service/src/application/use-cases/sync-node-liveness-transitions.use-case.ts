import { Inject, Injectable } from '@nestjs/common';

import {
  createMonitoringState,
  deriveInitialNotificationSyncStatus,
  deriveLifecycleStatus,
  type MonitoringState,
} from '../../domain/monitoring-state';
import { IncidentContextReadRepository } from '../ports/incident-context-read.repository';
import { MonitoringEventRepository } from '../ports/monitoring-event.repository';
import { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import { NodeOverviewReadRepository } from '../ports/node-overview-read.repository';

export interface SyncNodeLivenessTransitionsResult {
  evaluatedNodeIds: number;
  transitionedNodeIds: number;
  emittedEvents: number;
}

type NodeLiveState = 'online' | 'stale';

@Injectable()
export class SyncNodeLivenessTransitionsUseCase {
  constructor(
    @Inject(NodeOverviewReadRepository)
    private readonly nodeOverviewReadRepository: NodeOverviewReadRepository,
    @Inject(IncidentContextReadRepository)
    private readonly incidentContextReadRepository: IncidentContextReadRepository,
    @Inject(MonitoringStateRepository)
    private readonly monitoringStateRepository: MonitoringStateRepository,
    @Inject(MonitoringEventRepository)
    private readonly monitoringEventRepository: MonitoringEventRepository,
  ) {}

  async execute(): Promise<SyncNodeLivenessTransitionsResult> {
    const candidateNodeIds =
      await this.nodeOverviewReadRepository.listNodeIdsForOverviewSync();
    const evaluatedAt = new Date().toISOString();
    let transitionedNodeIds = 0;
    let emittedEvents = 0;

    for (const nodeId of candidateNodeIds) {
      const liveness = await this.incidentContextReadRepository.getNodeLiveness({
        nodeId,
      });
      const nextLiveState = deriveNodeLiveState(liveness);
      if (!liveness || !nextLiveState) {
        continue;
      }

      const previousState = await this.monitoringStateRepository.findByScope(
        'node',
        nodeId,
      );
      const previousLiveState = previousState
        ? mapMonitoringStateToNodeLiveState(previousState)
        : null;

      if (!previousState) {
        await this.monitoringStateRepository.save(
          buildNodeLivenessState({
            nodeId,
            liveState: nextLiveState,
            observedAt: evaluatedAt,
            previous: null,
          }),
        );
        continue;
      }

      if (previousLiveState === nextLiveState) {
        continue;
      }

      await this.monitoringStateRepository.save(
        buildNodeLivenessState({
          nodeId,
          liveState: nextLiveState,
          observedAt: evaluatedAt,
          previous: previousState,
        }),
      );
      transitionedNodeIds += 1;

      const eventType = nextLiveState === 'stale' ? 'node.stale' : 'node.online';
      const appendResult = await this.monitoringEventRepository.append({
        eventKey: `node-liveness:${nodeId}:${eventType}:${evaluatedAt}`,
        occurredAt: evaluatedAt,
        category: 'monitoring',
        type: eventType,
        scopeType: 'node',
        scopeId: nodeId,
        nodeId,
        source: 'node-liveness-sync',
        data: {
          nodeId,
          liveState: nextLiveState,
          previousLiveState,
          lastHeartbeatAt: liveness.lastHeartbeatAt ?? null,
          staleAgeSec: liveness.staleAgeSec ?? null,
          staleAfterSec: liveness.staleAfterSec ?? null,
          policyVersion: liveness.policyVersion ?? null,
        },
      });
      if (appendResult.inserted) {
        emittedEvents += 1;
      }
    }

    return {
      evaluatedNodeIds: candidateNodeIds.length,
      transitionedNodeIds,
      emittedEvents,
    };
  }
}

function deriveNodeLiveState(input: {
  staleAgeSec?: number | null;
  staleAfterSec?: number | null;
} | null): NodeLiveState | null {
  if (
    input?.staleAgeSec == null ||
    input.staleAfterSec == null ||
    !Number.isFinite(input.staleAgeSec) ||
    !Number.isFinite(input.staleAfterSec)
  ) {
    return null;
  }

  return input.staleAgeSec > input.staleAfterSec ? 'stale' : 'online';
}

function mapMonitoringStateToNodeLiveState(
  state: MonitoringState,
): NodeLiveState {
  return state.severityCode > 0 ? 'stale' : 'online';
}

function buildNodeLivenessState(input: {
  nodeId: string;
  liveState: NodeLiveState;
  observedAt: string;
  previous: MonitoringState | null;
}): MonitoringState {
  const severityCode = input.liveState === 'stale' ? 1 : 0;
  const fingerprint = `node-liveness:${input.nodeId}`;

  if (!input.previous) {
    return createMonitoringState({
      scopeType: 'node',
      scopeId: input.nodeId,
      fingerprint,
      severityCode,
      observedAt: input.observedAt,
    });
  }

  const lifecycleStatus = deriveLifecycleStatus(severityCode);
  return {
    ...input.previous,
    fingerprint,
    severityCode,
    lifecycleStatus,
    notificationSyncStatus:
      deriveInitialNotificationSyncStatus(lifecycleStatus),
    lastObservedAt: input.observedAt,
    lastStateChangedAt: input.observedAt,
    openedAt: lifecycleStatus === 'active' ? input.observedAt : null,
    resolvedAt: lifecycleStatus === 'resolved' ? input.observedAt : null,
    lastNotificationAttemptAt: null,
    lastNotificationSyncedAt: null,
  };
}
