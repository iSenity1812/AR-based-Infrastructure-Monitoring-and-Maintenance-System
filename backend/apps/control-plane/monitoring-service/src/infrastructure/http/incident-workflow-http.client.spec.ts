import { IncidentWorkflowHttpClient } from './incident-workflow-http.client';
import { MonitoringServiceConfig } from '../config/monitoring-service-config';

describe('IncidentWorkflowHttpClient', () => {
  it('sends capturedSnapshot as a top-level create incident field', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 'incident-1',
            incidentCode: 'MON-ALERT-123',
            title: 'Node CPU hot',
            severity: 'CRITICAL',
            status: 'OPEN',
            metadata: {
              fingerprint: 'fp-1',
            },
            capturedSnapshot: {
              schemaVersion: 'incident.context.v1',
              capturedAt: '2026-07-23T04:18:45.000Z',
              window: {
                from: '2026-07-23T03:48:45.000Z',
                to: '2026-07-23T04:18:45.000Z',
                interval: '1m',
              },
              completeness: 'partial',
              unavailableSources: [
                {
                  source: 'asset-service',
                  reasonCode: 'TIMEOUT',
                },
              ],
              alert: {
                fingerprint: 'fp-1',
                alertName: 'NodeStale',
                category: 'availability',
                severity: 'warning',
                metricKey: 'stale_age_sec',
                currentValue: '14543',
                threshold: '120',
                startsAt: '2026-07-23T04:00:00.000Z',
                summary: 'Node stale',
              },
              scope: {
                scopeType: 'node',
                scopeId: 'node-1',
                rackId: 'rack-1',
              },
              metricEvidence: [],
              sourceRefs: [],
            },
            createdAt: '2026-07-23T04:18:45.000Z',
            updatedAt: '2026-07-23T04:18:45.000Z',
          },
        }),
      } as Response);

    const client = new IncidentWorkflowHttpClient(
      new MonitoringServiceConfig({}),
    );

    const snapshot = {
      schemaVersion: 'incident.context.v1' as const,
      capturedAt: '2026-07-23T04:18:45.000Z',
      window: {
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
        interval: '1m' as const,
      },
      completeness: 'partial' as const,
      unavailableSources: [
        {
          source: 'asset-service' as const,
          reasonCode: 'TIMEOUT' as const,
        },
      ],
      alert: {
        fingerprint: 'fp-1',
        alertName: 'NodeStale',
        category: 'availability',
        severity: 'warning' as const,
        metricKey: 'stale_age_sec',
        currentValue: '14543',
        threshold: '120',
        startsAt: '2026-07-23T04:00:00.000Z',
        summary: 'Node stale',
      },
      scope: {
        scopeType: 'node' as const,
        scopeId: 'node-1',
        rackId: 'rack-1',
      },
      metricEvidence: [],
      sourceRefs: [],
    };

    const incident = await client.createIncident({
      authorizationHeader: 'Bearer token',
      correlationId: 'corr-1',
      incidentCode: 'MON-ALERT-123',
      title: 'Node CPU hot',
      severity: 'CRITICAL',
      metadata: {
        fingerprint: 'fp-1',
      },
      capturedSnapshot: snapshot,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:4011/api/v1/incidents',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          'x-correlation-id': 'corr-1',
        }),
        body: JSON.stringify({
          incidentCode: 'MON-ALERT-123',
          title: 'Node CPU hot',
          description: undefined,
          severity: 'CRITICAL',
          metadata: {
            fingerprint: 'fp-1',
          },
          capturedSnapshot: snapshot,
        }),
      }),
    );
    expect(incident.capturedSnapshot).toEqual(snapshot);

    fetchMock.mockRestore();
  });

  it('parses capturedSnapshot from a flat lookup response', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            items: [
              {
                id: 'incident-1',
                incidentCode: 'MON-ALERT-123',
                title: 'Node CPU hot',
                severity: 'CRITICAL',
                status: 'OPEN',
                metadata: {
                  fingerprint: 'fp-1',
                },
                capturedSnapshot: {
                  schemaVersion: 'incident.context.v1',
                  capturedAt: '2026-07-23T04:18:45.000Z',
                  window: {
                    from: '2026-07-23T03:48:45.000Z',
                    to: '2026-07-23T04:18:45.000Z',
                    interval: '1m',
                  },
                  completeness: 'minimal',
                  unavailableSources: [
                    {
                      source: 'clickhouse',
                      reasonCode: 'UPSTREAM_ERROR',
                    },
                  ],
                  alert: {
                    fingerprint: 'fp-1',
                    alertName: 'NodeStale',
                    category: 'availability',
                    severity: 'warning',
                    metricKey: 'stale_age_sec',
                    currentValue: '14543',
                    threshold: '120',
                    startsAt: '2026-07-23T04:00:00.000Z',
                    summary: 'Node stale',
                  },
                  scope: {
                    scopeType: 'node',
                    scopeId: 'node-1',
                  },
                  metricEvidence: [],
                  sourceRefs: [],
                },
                createdAt: '2026-07-23T04:18:45.000Z',
                updatedAt: '2026-07-23T04:18:45.000Z',
              },
            ],
          },
        }),
      } as Response);

    const client = new IncidentWorkflowHttpClient(
      new MonitoringServiceConfig({}),
    );

    const incident = await client.findIncidentByCode({
      authorizationHeader: 'Bearer token',
      incidentCode: 'MON-ALERT-123',
    });

    expect(incident?.capturedSnapshot).toEqual({
      schemaVersion: 'incident.context.v1',
      capturedAt: '2026-07-23T04:18:45.000Z',
      window: {
        from: '2026-07-23T03:48:45.000Z',
        to: '2026-07-23T04:18:45.000Z',
        interval: '1m',
      },
      completeness: 'minimal',
      unavailableSources: [
        {
          source: 'clickhouse',
          reasonCode: 'UPSTREAM_ERROR',
        },
      ],
      alert: {
        fingerprint: 'fp-1',
        alertName: 'NodeStale',
        category: 'availability',
        severity: 'warning',
        metricKey: 'stale_age_sec',
        currentValue: '14543',
        threshold: '120',
        startsAt: '2026-07-23T04:00:00.000Z',
        summary: 'Node stale',
      },
      scope: {
        scopeType: 'node',
        scopeId: 'node-1',
      },
      metricEvidence: [],
      sourceRefs: [],
    });

    fetchMock.mockRestore();
  });
});
