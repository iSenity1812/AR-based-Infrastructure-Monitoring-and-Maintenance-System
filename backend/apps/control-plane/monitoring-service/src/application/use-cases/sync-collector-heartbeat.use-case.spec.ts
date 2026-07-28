import { describe, expect, it, jest } from '@jest/globals';

import { SyncCollectorHeartbeatUseCase } from './sync-collector-heartbeat.use-case';

describe('SyncCollectorHeartbeatUseCase', () => {
  it('normalizes and upserts a collector heartbeat', async () => {
    const repository = {
      upsertHeartbeat: jest.fn().mockResolvedValue({
        nodeId: 'node-a1',
        agentId: 'agent-a1',
        lastHeartbeatAt: '2026-07-21T08:15:30.000Z',
        source: 'go-agent-collector',
        metricKey: 'agent.heartbeat',
        sourceMetric: 'collector.runtime.heartbeat',
      }),
    };
    const useCase = new SyncCollectorHeartbeatUseCase(repository as never);

    await expect(
      useCase.execute({
        nodeId: 'node-a1',
        agentId: 'agent-a1',
        observedAt: '2026-07-21T08:15:30.000Z',
        source: 'go-agent-collector',
        metricKey: 'agent.heartbeat',
        sourceMetric: 'collector.runtime.heartbeat',
      }),
    ).resolves.toEqual({
      nodeId: 'node-a1',
      synced: true,
      lastHeartbeatAt: '2026-07-21T08:15:30.000Z',
    });
  });
});
