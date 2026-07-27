import { describe, expect, it, jest } from '@jest/globals';

import type { MonitoringEvent } from '../../../application/ports/monitoring-event.repository';
import {
  MonitoringEventMongoRepository,
  mapDocumentToMonitoringEvent,
  mapMonitoringEventToPersistence,
} from './monitoring-event-mongo.repository';
import { MonitoringEventSchema } from './monitoring-event.schema';

function buildMonitoringEvent(): MonitoringEvent {
  return {
    eventKey: 'alert:fp-1:alert.fired:2026-07-22T07:21:30.000Z',
    occurredAt: '2026-07-22T07:21:30.000Z',
    category: 'alert',
    type: 'alert.fired',
    scopeType: 'node',
    scopeId: 'node-a1',
    nodeId: 'node-a1',
    rackId: 'rack-a',
    fingerprint: 'fp-1',
    source: 'external-alert-sync',
    data: {
      alertName: 'NodeStale',
      metricKey: 'stale_age_sec',
    },
  };
}

describe('MonitoringEventMongoRepository mappings', () => {
  it('maps a monitoring event into persistence shape', () => {
    const persistence = mapMonitoringEventToPersistence(buildMonitoringEvent());

    expect(persistence).toMatchObject({
      eventKey: 'alert:fp-1:alert.fired:2026-07-22T07:21:30.000Z',
      scopeType: 'node',
      scopeId: 'node-a1',
      nodeId: 'node-a1',
      rackId: 'rack-a',
      fingerprint: 'fp-1',
      category: 'alert',
    });
    expect(persistence.occurredAt).toBeInstanceOf(Date);
  });

  it('maps a persistence document back into the public event shape', () => {
    const event = mapDocumentToMonitoringEvent({
      eventKey: 'node-liveness:node-a1:node.stale:2026-07-22T07:30:00.000Z',
      occurredAt: new Date('2026-07-22T07:30:00.000Z'),
      category: 'monitoring',
      type: 'node.stale',
      scopeType: 'node',
      scopeId: 'node-a1',
      nodeId: 'node-a1',
      rackId: 'rack-a',
      fingerprint: null,
      incidentCode: null,
      source: 'node-liveness-sync',
      data: { staleAgeSec: 121 },
      createdAt: new Date('2026-07-22T07:30:01.000Z'),
    });

    expect(event).toEqual({
      eventKey: 'node-liveness:node-a1:node.stale:2026-07-22T07:30:00.000Z',
      occurredAt: '2026-07-22T07:30:00.000Z',
      category: 'monitoring',
      type: 'node.stale',
      scopeType: 'node',
      scopeId: 'node-a1',
      nodeId: 'node-a1',
      rackId: 'rack-a',
      fingerprint: null,
      incidentCode: null,
      source: 'node-liveness-sync',
      data: { staleAgeSec: 121 },
      createdAt: '2026-07-22T07:30:01.000Z',
    });
  });
});

describe('MonitoringEventMongoRepository', () => {
  it('appends events by creating a new document', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const repository = new MonitoringEventMongoRepository({
      create,
    } as never);

    const result = await repository.append(buildMonitoringEvent());

    expect(result).toEqual({ inserted: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'alert:fp-1:alert.fired:2026-07-22T07:21:30.000Z',
      }),
    );
  });

  it('absorbs duplicate event keys', async () => {
    const create = jest.fn().mockRejectedValue({ code: 11000 });
    const repository = new MonitoringEventMongoRepository({
      create,
    } as never);

    const result = await repository.append(buildMonitoringEvent());

    expect(result).toEqual({ inserted: false });
  });

  it('queries events by scope and time window in chronological order', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });
    const find = jest.fn().mockReturnValue({ sort });

    const repository = new MonitoringEventMongoRepository({
      find,
    } as never);

    await repository.listByScopeAndWindow({
      scopeType: 'rack',
      scopeId: 'rack-a',
      from: '2026-07-22T07:00:00.000Z',
      to: '2026-07-22T08:00:00.000Z',
    });

    expect(find).toHaveBeenCalledWith({
      scopeType: 'rack',
      scopeId: 'rack-a',
      occurredAt: {
        $gte: new Date('2026-07-22T07:00:00.000Z'),
        $lte: new Date('2026-07-22T08:00:00.000Z'),
      },
    });
    expect(sort).toHaveBeenCalledWith({
      occurredAt: 1,
      eventKey: 1,
    });
  });

  it('declares the expected indexes for timeline reads', () => {
    const indexes = MonitoringEventSchema.indexes().map(([spec]) => spec);

    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventKey: 1 }),
        expect.objectContaining({ scopeType: 1, scopeId: 1, occurredAt: 1 }),
        expect.objectContaining({ fingerprint: 1, occurredAt: 1 }),
        expect.objectContaining({ rackId: 1, occurredAt: 1 }),
        expect.objectContaining({ nodeId: 1, occurredAt: 1 }),
      ]),
    );
  });
});
