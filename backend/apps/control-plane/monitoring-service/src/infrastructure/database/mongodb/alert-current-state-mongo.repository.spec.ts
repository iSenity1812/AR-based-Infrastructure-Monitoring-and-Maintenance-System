import { describe, expect, it, jest } from '@jest/globals';

import {
  type AlertCurrentState,
} from '../../../domain/alert-current-state';
import {
  AlertCurrentStateMongoRepository,
  mapAlertCurrentStateToPersistence,
  mapDocumentToAlertCurrentState,
} from './alert-current-state-mongo.repository';

function buildNodeAlertCurrentState(): AlertCurrentState {
  return {
    fingerprint: 'fp-node-01',
    alertName: 'NodePacketLossHigh',
    scopeType: 'node',
    nodeId: 'node-a1',
    rackId: 'rack-a',
    severity: 'warning',
    status: 'firing',
    category: 'network',
    environment: 'lab',
    team: 'infra',
    source: 'grafana',
    summary: 'Node packet loss is high',
    description: 'Packet retransmit stayed above threshold.',
    metricKey: 'tcp_retransmit_pct_max_current',
    observedWindow: '5m',
    dashboardUrl: '/d/monitoring-overview',
    runbookUrl: '/docs/runbooks/alerting/node-packet-loss-high',
    currentValue: '8.4',
    threshold: '5',
    startsAt: '2026-07-15T01:00:00.000Z',
    endsAt: null,
    lastReceivedAt: '2026-07-15T01:01:00.000Z',
    firstSyncedAt: '2026-07-15T01:01:02.000Z',
    lastSyncedAt: '2026-07-15T01:01:02.000Z',
    lastStatusChangedAt: '2026-07-15T01:00:00.000Z',
  };
}

describe('AlertCurrentStateMongoRepository mappings', () => {
  it('maps alert current state into persistence shape for upsert', () => {
    const persistence = mapAlertCurrentStateToPersistence(
      buildNodeAlertCurrentState(),
    );

    expect(persistence).toMatchObject({
      fingerprint: 'fp-node-01',
      scopeType: 'node',
      nodeId: 'node-a1',
      rackId: 'rack-a',
      workloadId: null,
      serviceId: null,
      category: 'network',
      status: 'firing',
    });
  });

  it('maps a service alert persistence document back into domain shape', () => {
    const state = mapDocumentToAlertCurrentState({
      fingerprint: 'fp-svc-01',
      alertName: 'ServicePartialOutage',
      scopeType: 'service',
      nodeId: null,
      rackId: null,
      workloadId: null,
      serviceId: 'svc-auth-api',
      severity: 'warning',
      category: 'availability',
      status: 'resolved',
      environment: 'lab',
      team: 'infra',
      source: 'grafana',
      summary: 'Service auth-api running 2 / 5 containers',
      description: 'Service capacity dropped below expected replica count.',
      metricKey: 'running_container_ratio_current',
      observedWindow: 'current-snapshot',
      dashboardUrl: '/d/monitoring-overview',
      runbookUrl: '/docs/runbooks/alerting/service-partial-outage',
      currentValue: '40.0',
      threshold: '100',
      startsAt: '2026-07-15T02:00:00.000Z',
      endsAt: '2026-07-15T02:10:00.000Z',
      lastReceivedAt: '2026-07-15T02:10:01.000Z',
      firstSyncedAt: '2026-07-15T02:00:02.000Z',
      lastSyncedAt: '2026-07-15T02:10:02.000Z',
      lastStatusChangedAt: '2026-07-15T02:10:00.000Z',
    });

    expect(state).toMatchObject({
      scopeType: 'service',
      serviceId: 'svc-auth-api',
      status: 'resolved',
      category: 'availability',
    });
  });
});

describe('AlertCurrentStateMongoRepository', () => {
  it('looks up by fingerprint and upserts by fingerprint', async () => {
    const execFind = jest.fn().mockResolvedValue(null);
    const leanFind = jest.fn().mockReturnValue({ exec: execFind });
    const findOne = jest.fn().mockReturnValue({ lean: leanFind });
    const execUpdate = jest.fn().mockResolvedValue(undefined);
    const updateOne = jest.fn().mockReturnValue({ exec: execUpdate });

    const repository = new AlertCurrentStateMongoRepository({
      findOne,
      updateOne,
    } as never);

    await repository.findByFingerprint('fp-node-01');
    await repository.upsert(buildNodeAlertCurrentState());

    expect(findOne).toHaveBeenCalledWith({ fingerprint: 'fp-node-01' });
    expect(updateOne).toHaveBeenCalledWith(
      { fingerprint: 'fp-node-01' },
      expect.objectContaining({
        $set: expect.objectContaining({
          fingerprint: 'fp-node-01',
          nodeId: 'node-a1',
          category: 'network',
        }),
      }),
      { upsert: true },
    );
  });

  it('lists active alerts by explicit scope key instead of scopeId', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });
    const find = jest.fn().mockReturnValue({ sort });

    const repository = new AlertCurrentStateMongoRepository({
      find,
    } as never);

    await repository.listActiveByRackId('rack-a');

    expect(find).toHaveBeenCalledWith({
      rackId: 'rack-a',
      status: 'firing',
    });
  });
});
