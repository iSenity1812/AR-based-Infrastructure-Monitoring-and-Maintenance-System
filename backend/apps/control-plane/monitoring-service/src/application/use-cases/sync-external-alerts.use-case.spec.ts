import { describe, expect, it, jest } from '@jest/globals';

import type { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import { SyncExternalAlertsUseCase } from './sync-external-alerts.use-case';

describe('SyncExternalAlertsUseCase', () => {
  it('persists mapped alerts and reports invalid items', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
    };

    const useCase = new SyncExternalAlertsUseCase(repository);

    const result = await useCase.execute({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'firing',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
        {
          fingerprint: 'fp-2',
          status: 'firing',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: null,
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'null',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'null',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
      ],
    });

    expect(repository.upsert).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'fp-1',
        rawLabels: expect.objectContaining({
          rack_id: 'rack-a1',
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        totalReceived: 2,
        synced: 1,
        invalid: 1,
        skipped: 0,
      }),
    );
  });

  it('preserves firstSyncedAt when updating an existing alert', async () => {
    const repository: AlertCurrentStateRepository = {
      findByFingerprint: jest.fn().mockResolvedValue({
        fingerprint: 'fp-1',
        alertName: 'RackSignalLossPresent',
        rawLabels: { rack_id: 'rack-a1' },
        rawAnnotations: { summary: 'old' },
        scopeType: 'rack',
        rackId: 'rack-a1',
        severity: 'critical',
        status: 'firing',
        category: 'connectivity',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'old',
        description: 'old',
        metricKey: null,
        observedWindow: null,
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: null,
        threshold: null,
        startsAt: '2026-07-14T13:12:50Z',
        endsAt: null,
        lastReceivedAt: '2026-07-15T00:00:00.000Z',
        firstSyncedAt: '2026-07-15T00:00:00.000Z',
        lastSyncedAt: '2026-07-15T00:00:00.000Z',
        lastStatusChangedAt: '2026-07-15T00:00:00.000Z',
      }),
      upsert: jest.fn().mockResolvedValue(undefined),
      listByStatus: jest.fn(),
      listActiveByNodeId: jest.fn(),
      listActiveByRackId: jest.fn(),
      listActiveByWorkloadId: jest.fn(),
      listActiveByServiceId: jest.fn(),
    };

    const useCase = new SyncExternalAlertsUseCase(repository);

    await useCase.execute({
      receivedAt: '2026-07-15T01:00:00.000Z',
      commonLabels: {
        source: 'grafana',
        environment: 'lab',
        team: 'infra',
        category: 'connectivity',
      },
      commonAnnotations: {},
      alerts: [
        {
          fingerprint: 'fp-1',
          status: 'resolved',
          startsAt: '2026-07-14T13:12:50Z',
          endsAt: '2026-07-14T13:14:50Z',
          generatorUrl: null,
          labels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          annotations: {
            summary: 'Rack signal loss',
          },
          rawLabels: {
            alertname: 'RackSignalLossPresent',
            scope_type: 'rack',
            rack_id: 'rack-a1',
            severity: 'critical',
          },
          rawAnnotations: {
            summary: 'Rack signal loss',
          },
        },
      ],
    });

    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        firstSyncedAt: '2026-07-15T00:00:00.000Z',
        status: 'resolved',
      }),
    );
  });
});
