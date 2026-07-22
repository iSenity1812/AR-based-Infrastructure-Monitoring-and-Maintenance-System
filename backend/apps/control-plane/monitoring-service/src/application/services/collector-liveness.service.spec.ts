import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  CollectorLivenessService,
  computeFreshnessSec,
  deriveCollectorStatus,
} from './collector-liveness.service';

describe('deriveCollectorStatus', () => {
  it('returns UNKNOWN when no heartbeat freshness is available', () => {
    expect(deriveCollectorStatus(null, 90)).toBe('UNKNOWN');
  });

  it('returns ONLINE when freshness is within timeout', () => {
    expect(deriveCollectorStatus(12, 90)).toBe('ONLINE');
  });

  it('returns OFFLINE when freshness exceeds timeout', () => {
    expect(deriveCollectorStatus(91, 90)).toBe('OFFLINE');
  });
});

describe('computeFreshnessSec', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T08:16:00.000Z'));
  });

  it('computes freshness in seconds from the heartbeat timestamp', () => {
    expect(computeFreshnessSec('2026-07-21T08:15:30.000Z')).toBe(30);
  });
});

describe('CollectorLivenessService', () => {
  it('returns UNKNOWN when the node has no heartbeat yet', async () => {
    const repository = {
      findByNodeId: jest.fn().mockResolvedValue(null),
    };
    const config = {
      collectorHeartbeatTimeoutSec: 90,
    };

    const service = new CollectorLivenessService(
      repository as never,
      config as never,
    );

    await expect(service.getByNodeId('node-a1')).resolves.toMatchObject({
      nodeId: 'node-a1',
      collectorStatus: 'UNKNOWN',
      heartbeatTimeoutSec: 90,
    });
  });

  it('returns ONLINE when a recent heartbeat exists', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-21T08:16:00.000Z'));

    const repository = {
      findByNodeId: jest.fn().mockResolvedValue({
        nodeId: 'node-a1',
        agentId: 'agent-a1',
        lastHeartbeatAt: '2026-07-21T08:15:30.000Z',
        source: 'go-agent-collector',
        metricKey: 'agent.heartbeat',
        sourceMetric: 'collector.runtime.heartbeat',
      }),
    };
    const config = {
      collectorHeartbeatTimeoutSec: 90,
    };

    const service = new CollectorLivenessService(
      repository as never,
      config as never,
    );

    await expect(service.getByNodeId('node-a1')).resolves.toMatchObject({
      nodeId: 'node-a1',
      collectorStatus: 'ONLINE',
      collectorFreshnessSec: 30,
    });
  });
});
