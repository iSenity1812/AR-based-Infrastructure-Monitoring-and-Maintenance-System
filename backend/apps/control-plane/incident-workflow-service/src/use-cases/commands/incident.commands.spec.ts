import { IncidentSeverity } from '@domain/constants/incident-severity.enum';
import { IncidentStatus } from '@domain/constants/incident-status.enum';
import { IncidentEntity } from '@domain/entities/incident.entity';
import type { IncidentRepositoryPort } from '@domain/ports/incident-repository.port';
import { GetIncidentUseCase } from './incident.commands';

function buildIncidentEntity(
  overrides: Partial<IncidentEntity['props']> = {},
): IncidentEntity {
  return new IncidentEntity({
    id: 'incident-1',
    incidentCode: 'INC-001',
    title: 'Node stale',
    description: 'Investigate node stale condition',
    severity: IncidentSeverity.CRITICAL,
    status: IncidentStatus.OPEN,
    ticketIds: ['ticket-1'],
    metadata: {
      source: 'monitoring_alert',
      scopeType: 'node',
      nodeId: 'node-1',
    },
    capturedSnapshot: {
      schemaVersion: 'incident.context.v1',
      capturedAt: '2026-07-23T04:18:45.000Z',
      window: {
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
        interval: '1m',
      },
      completeness: 'complete',
      unavailableSources: [],
      alert: { fingerprint: 'fp-1' },
      scope: {
        scopeType: 'node',
        scopeId: 'node-1',
        rackId: 'rack-1',
      },
      metricEvidence: [],
      sourceRefs: [],
    },
    createdAt: new Date('2026-07-23T04:20:00.000Z'),
    updatedAt: new Date('2026-07-23T04:21:00.000Z'),
    ...overrides,
  });
}

describe('GetIncidentUseCase', () => {
  it('returns related incidents for the same scope and excludes the current incident', async () => {
    const incidentRepository: IncidentRepositoryPort = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(buildIncidentEntity()),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn().mockResolvedValue([
        buildIncidentEntity({
          id: 'incident-2',
          incidentCode: 'INC-002',
          title: 'Node stale previous',
        }),
      ]),
      update: jest.fn(),
    };

    const useCase = new GetIncidentUseCase(incidentRepository);

    const result = await useCase.execute('incident-1');

    expect(incidentRepository.findRelatedByScope).toHaveBeenCalledWith({
      scopeType: 'node',
      scopeId: 'node-1',
      excludeIncidentId: 'incident-1',
      limit: 10,
    });
    expect(result.relatedIncidents).toHaveLength(1);
    expect(result.relatedIncidents[0]?.props.incidentCode).toBe('INC-002');
  });

  it('returns an empty related incident list when scope cannot be derived', async () => {
    const incidentRepository: IncidentRepositoryPort = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        buildIncidentEntity({
          metadata: {},
          capturedSnapshot: undefined,
        }),
      ),
      findByCode: jest.fn(),
      findMany: jest.fn(),
      findRelatedByScope: jest.fn(),
      update: jest.fn(),
    };

    const useCase = new GetIncidentUseCase(incidentRepository);

    const result = await useCase.execute('incident-1');

    expect(result.relatedIncidents).toEqual([]);
    expect(incidentRepository.findRelatedByScope).not.toHaveBeenCalled();
  });
});
