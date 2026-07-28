import { describe, expect, it, jest } from '@jest/globals';

import type { IncidentContextReadRepository } from '../ports/incident-context-read.repository';
import type { MonitoringEventRepository } from '../ports/monitoring-event.repository';
import type { MonitoringStateRepository } from '../ports/monitoring-state.repository';
import type { NodeOverviewReadRepository } from '../ports/node-overview-read.repository';
import { SyncNodeLivenessTransitionsUseCase } from './sync-node-liveness-transitions.use-case';

describe('SyncNodeLivenessTransitionsUseCase', () => {
  it('creates a baseline state without emitting events on first observation', async () => {
    const nodeOverviewReadRepository = createNodeOverviewReadRepository([
      'node-a1',
    ]);
    const incidentContextReadRepository = createIncidentContextReadRepository({
      'node-a1': {
        nodeId: 'node-a1',
        lastHeartbeatAt: '2026-07-24T08:00:00.000Z',
        staleAgeSec: 30,
        staleAfterSec: 120,
        policyVersion: 1,
      },
    });
    const monitoringStateRepository = createMonitoringStateRepository();
    const monitoringEventRepository = createMonitoringEventRepository();

    const useCase = new SyncNodeLivenessTransitionsUseCase(
      nodeOverviewReadRepository,
      incidentContextReadRepository,
      monitoringStateRepository,
      monitoringEventRepository,
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      evaluatedNodeIds: 1,
      transitionedNodeIds: 0,
      emittedEvents: 0,
    });
    expect(monitoringStateRepository.save).toHaveBeenCalledTimes(1);
    expect(monitoringEventRepository.append).not.toHaveBeenCalled();
  });

  it('emits node.stale when the node transitions from online to stale', async () => {
    const nodeOverviewReadRepository = createNodeOverviewReadRepository([
      'node-a1',
    ]);
    const incidentContextReadRepository = createIncidentContextReadRepository({
      'node-a1': {
        nodeId: 'node-a1',
        lastHeartbeatAt: '2026-07-24T08:00:00.000Z',
        staleAgeSec: 121,
        staleAfterSec: 120,
        policyVersion: 1,
      },
    });
    const monitoringStateRepository = createMonitoringStateRepository({
      severityCode: 0,
    });
    const monitoringEventRepository = createMonitoringEventRepository();

    const useCase = new SyncNodeLivenessTransitionsUseCase(
      nodeOverviewReadRepository,
      incidentContextReadRepository,
      monitoringStateRepository,
      monitoringEventRepository,
    );

    const result = await useCase.execute();

    expect(result.transitionedNodeIds).toBe(1);
    expect(monitoringEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'node.stale',
        scopeType: 'node',
        scopeId: 'node-a1',
        data: expect.objectContaining({
          liveState: 'stale',
          previousLiveState: 'online',
          staleAgeSec: 121,
        }),
      }),
    );
  });

  it('emits node.online when the node transitions from stale to online', async () => {
    const nodeOverviewReadRepository = createNodeOverviewReadRepository([
      'node-a1',
    ]);
    const incidentContextReadRepository = createIncidentContextReadRepository({
      'node-a1': {
        nodeId: 'node-a1',
        lastHeartbeatAt: '2026-07-24T08:10:00.000Z',
        staleAgeSec: 10,
        staleAfterSec: 120,
        policyVersion: 1,
      },
    });
    const monitoringStateRepository = createMonitoringStateRepository({
      severityCode: 1,
    });
    const monitoringEventRepository = createMonitoringEventRepository();

    const useCase = new SyncNodeLivenessTransitionsUseCase(
      nodeOverviewReadRepository,
      incidentContextReadRepository,
      monitoringStateRepository,
      monitoringEventRepository,
    );

    const result = await useCase.execute();

    expect(result.transitionedNodeIds).toBe(1);
    expect(monitoringEventRepository.append).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'node.online',
        data: expect.objectContaining({
          liveState: 'online',
          previousLiveState: 'stale',
        }),
      }),
    );
  });

  it('skips nodes when policy data is unavailable', async () => {
    const nodeOverviewReadRepository = createNodeOverviewReadRepository([
      'node-a1',
    ]);
    const incidentContextReadRepository = createIncidentContextReadRepository({
      'node-a1': {
        nodeId: 'node-a1',
        lastHeartbeatAt: '2026-07-24T08:10:00.000Z',
        staleAgeSec: null,
        staleAfterSec: 120,
        policyVersion: 1,
      },
    });
    const monitoringStateRepository = createMonitoringStateRepository({
      severityCode: 0,
    });
    const monitoringEventRepository = createMonitoringEventRepository();

    const useCase = new SyncNodeLivenessTransitionsUseCase(
      nodeOverviewReadRepository,
      incidentContextReadRepository,
      monitoringStateRepository,
      monitoringEventRepository,
    );

    const result = await useCase.execute();

    expect(result.transitionedNodeIds).toBe(0);
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
    expect(monitoringEventRepository.append).not.toHaveBeenCalled();
  });

  it('does not emit duplicate events for unchanged cycles', async () => {
    const nodeOverviewReadRepository = createNodeOverviewReadRepository([
      'node-a1',
    ]);
    const incidentContextReadRepository = createIncidentContextReadRepository({
      'node-a1': {
        nodeId: 'node-a1',
        lastHeartbeatAt: '2026-07-24T08:10:00.000Z',
        staleAgeSec: 10,
        staleAfterSec: 120,
        policyVersion: 1,
      },
    });
    const monitoringStateRepository = createMonitoringStateRepository({
      severityCode: 0,
    });
    const monitoringEventRepository = createMonitoringEventRepository();

    const useCase = new SyncNodeLivenessTransitionsUseCase(
      nodeOverviewReadRepository,
      incidentContextReadRepository,
      monitoringStateRepository,
      monitoringEventRepository,
    );

    const result = await useCase.execute();

    expect(result.transitionedNodeIds).toBe(0);
    expect(monitoringStateRepository.save).not.toHaveBeenCalled();
    expect(monitoringEventRepository.append).not.toHaveBeenCalled();
  });
});

function createNodeOverviewReadRepository(
  nodeIds: string[],
): NodeOverviewReadRepository {
  return {
    listNodeIdsForOverviewSync: jest.fn().mockResolvedValue(nodeIds),
    getLatestNodeChangeSummaryTs: jest.fn(),
    listChangedNodeIdsSince: jest.fn(),
    listNodeWorkloads: jest.fn(),
    getNodeSummary: jest.fn(),
  } as never;
}

function createIncidentContextReadRepository(
  states: Record<string, unknown>,
): IncidentContextReadRepository {
  return {
    getNodeLiveness: jest.fn().mockImplementation(({ nodeId }) => {
      return Promise.resolve((states[nodeId] as never) ?? null);
    }),
    getNodeContext: jest.fn(),
    getNodeInvestigation: jest.fn(),
    getRackInvestigation: jest.fn(),
  } as never;
}

function createMonitoringStateRepository(
  overrides?: Partial<{
    severityCode: number;
  }>,
): MonitoringStateRepository {
  const state = overrides
    ? {
        scopeType: 'node' as const,
        scopeId: 'node-a1',
        scopeKey: 'node:node-a1',
        fingerprint: 'node-liveness:node-a1',
        severityCode: overrides.severityCode ?? 0,
        overrideFlag: false,
        lifecycleStatus:
          (overrides.severityCode ?? 0) > 0 ? 'active' : 'resolved',
        notificationSyncStatus: 'idle' as const,
        firstObservedAt: '2026-07-24T07:00:00.000Z',
        lastObservedAt: '2026-07-24T07:00:00.000Z',
        lastStateChangedAt: '2026-07-24T07:00:00.000Z',
        openedAt: null,
        resolvedAt: '2026-07-24T07:00:00.000Z',
        lastNotificationAttemptAt: null,
        lastNotificationSyncedAt: null,
      }
    : null;

  return {
    listByScopeType: jest.fn(),
    findByScope: jest.fn().mockResolvedValue(state),
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function createMonitoringEventRepository(): MonitoringEventRepository {
  return {
    append: jest.fn().mockResolvedValue({ inserted: true }),
    listByScopeAndWindow: jest.fn(),
  };
}
