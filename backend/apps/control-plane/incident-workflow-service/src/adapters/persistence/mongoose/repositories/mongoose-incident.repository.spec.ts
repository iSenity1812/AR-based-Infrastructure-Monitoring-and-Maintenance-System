import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import type { IncidentCapturedSnapshot } from '@domain/entities/incident.entity';
import { MongooseIncidentRepository } from './mongoose-incident.repository';

function buildSnapshot(
  overrides: Partial<IncidentCapturedSnapshot> = {},
): IncidentCapturedSnapshot {
  return {
    schemaVersion: 'incident.context.v1',
    capturedAt: '2026-07-23T04:18:45.000Z',
    window: {
      from: '2026-07-23T03:48:45.000Z',
      to: '2026-07-23T04:18:45.000Z',
      interval: '1m',
    },
    completeness: 'complete',
    unavailableSources: [],
    alert: {
      fingerprint: 'fp-1',
    },
    scope: {
      scopeType: 'node',
      scopeId: 'node-1',
      rackId: 'rack-1',
    },
    metricEvidence: [],
    sourceRefs: [],
    ...overrides,
  };
}

function createDocument(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const document: Record<string, unknown> = {
    _id: {
      toString: () => 'incident-1',
    },
    incidentCode: 'INC-001',
    title: 'Node stale',
    description: 'Investigate node stale condition',
    severity: IncidentSeverity.CRITICAL,
    status: IncidentStatus.OPEN,
    ticketIds: ['ticket-1'],
    createdBy: {
      userId: 'user-1',
      username: 'admin01',
      fullName: 'Admin 01',
      source: 'incident_console',
    },
    metadata: {
      source: 'monitoring_alert',
    },
    createdAt: new Date('2026-07-23T04:20:00.000Z'),
    updatedAt: new Date('2026-07-23T04:21:00.000Z'),
  };

  Object.assign(document, overrides);

  document.set = jest.fn((input: Record<string, unknown>) => {
    Object.assign(document, input);
  });
  document.save = jest.fn(async () => document);

  return document;
}

describe('MongooseIncidentRepository', () => {
  it('maps a created captured snapshot', async () => {
    const snapshot = buildSnapshot();
    const model = {
      create: jest.fn().mockResolvedValue(
        createDocument({
          capturedSnapshot: snapshot,
        }),
      ),
    };
    const repository = new MongooseIncidentRepository(model as never);

    const incident = await repository.create({
      incidentCode: 'INC-001',
      title: 'Node stale',
      severity: IncidentSeverity.CRITICAL,
      status: IncidentStatus.OPEN,
      metadata: {},
      capturedSnapshot: snapshot,
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        capturedSnapshot: snapshot,
      }),
    );
    expect(incident.props.capturedSnapshot).toEqual(snapshot);
  });

  it('loads legacy incidents without a captured snapshot', async () => {
    const model = {
      findById: jest.fn().mockResolvedValue(createDocument()),
    };
    const repository = new MongooseIncidentRepository(model as never);

    const incident = await repository.findById('incident-1');

    expect(incident?.props.capturedSnapshot).toBeUndefined();
  });

  it('refuses to overwrite an existing captured snapshot during update', async () => {
    const originalSnapshot = buildSnapshot();
    const replacementSnapshot = buildSnapshot({
      capturedAt: '2026-07-23T04:30:00.000Z',
    });
    const document = createDocument({
      capturedSnapshot: originalSnapshot,
    });
    const model = {
      findById: jest.fn().mockResolvedValue(document),
    };
    const repository = new MongooseIncidentRepository(model as never);

    const incident = await repository.update('incident-1', {
      title: 'Updated title',
      capturedSnapshot: replacementSnapshot,
    });

    expect(document.set).toHaveBeenCalledWith({
      title: 'Updated title',
    });
    expect(incident?.props.title).toBe('Updated title');
    expect(incident?.props.capturedSnapshot).toEqual(originalSnapshot);
  });

  it('allows a first captured snapshot to be attached to a legacy incident', async () => {
    const snapshot = buildSnapshot();
    const document = createDocument();
    const model = {
      findById: jest.fn().mockResolvedValue(document),
    };
    const repository = new MongooseIncidentRepository(model as never);

    const incident = await repository.update('incident-1', {
      capturedSnapshot: snapshot,
    });

    expect(document.set).toHaveBeenCalledWith({
      capturedSnapshot: snapshot,
    });
    expect(incident?.props.capturedSnapshot).toEqual(snapshot);
  });

  it('filters incident lists by captured snapshot scope and legacy metadata scope', async () => {
    const documents = [
      createDocument({
        capturedSnapshot: buildSnapshot(),
      }),
    ];
    const sort = jest.fn().mockResolvedValue(documents);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseIncidentRepository({
      find,
    } as never);

    const incidents = await repository.findMany({
      status: IncidentStatus.OPEN,
      scopeType: 'node',
      scopeId: 'node-1',
    });

    expect(find).toHaveBeenCalledWith({
      status: IncidentStatus.OPEN,
      $or: [
        {
          'capturedSnapshot.scope.scopeType': 'node',
          'capturedSnapshot.scope.scopeId': 'node-1',
        },
        {
          'metadata.scopeType': 'node',
          'metadata.nodeId': 'node-1',
        },
      ],
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(incidents).toHaveLength(1);
  });

  it('finds related incidents by captured snapshot scope and excludes the current incident', async () => {
    const documents = [
      createDocument({
        _id: { toString: () => 'incident-2' },
        incidentCode: 'INC-002',
        capturedSnapshot: buildSnapshot(),
      }),
    ];
    const limit = jest.fn().mockResolvedValue(documents);
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseIncidentRepository({
      find,
    } as never);

    const incidents = await repository.findRelatedByScope({
      scopeType: 'node',
      scopeId: 'node-1',
      excludeIncidentId: 'incident-1',
      limit: 5,
    });

    expect(find).toHaveBeenCalledWith({
      _id: { $ne: 'incident-1' },
      $or: [
        {
          'capturedSnapshot.scope.scopeType': 'node',
          'capturedSnapshot.scope.scopeId': 'node-1',
        },
        {
          'metadata.scopeType': 'node',
          'metadata.nodeId': 'node-1',
        },
      ],
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limit).toHaveBeenCalledWith(5);
    expect(incidents).toHaveLength(1);
    expect(incidents[0]?.props.incidentCode).toBe('INC-002');
  });

  it('falls back to rack metadata scope for legacy related incidents', async () => {
    const documents = [
      createDocument({
        _id: { toString: () => 'incident-3' },
        incidentCode: 'INC-003',
        metadata: {
          source: 'monitoring_alert',
          scopeType: 'rack',
          rackId: 'rack-1',
        },
      }),
    ];
    const limit = jest.fn().mockResolvedValue(documents);
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseIncidentRepository({
      find,
    } as never);

    const incidents = await repository.findRelatedByScope({
      scopeType: 'rack',
      scopeId: 'rack-1',
      excludeIncidentId: 'incident-1',
    });

    expect(find).toHaveBeenCalledWith({
      _id: { $ne: 'incident-1' },
      $or: [
        {
          'capturedSnapshot.scope.scopeType': 'rack',
          'capturedSnapshot.scope.scopeId': 'rack-1',
        },
        {
          'metadata.scopeType': 'rack',
          'metadata.rackId': 'rack-1',
        },
      ],
    });
    expect(incidents[0]?.props.incidentCode).toBe('INC-003');
  });
});
