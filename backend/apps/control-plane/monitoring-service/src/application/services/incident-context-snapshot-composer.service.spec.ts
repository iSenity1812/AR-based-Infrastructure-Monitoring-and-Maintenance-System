import { IncidentContextSnapshotComposerService } from './incident-context-snapshot-composer.service';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

describe('IncidentContextSnapshotComposerService', () => {
  it('composes a complete node snapshot with separated canonical and observed hardware context', async () => {
    const service = new IncidentContextSnapshotComposerService(
      {
        getNodeContext: jest.fn().mockResolvedValue({
          currentCondition: {
            summaryTs: '2026-07-23T04:16:44.000Z',
            healthCode: 4,
            operationalSeverityCode: 0,
            signalSeverityCode: 2,
            isAnyStale: true,
            staleMetricCount: 1,
            warningMetricCount: 0,
            criticalMetricCount: 0,
            worstMetricKey: 'node.heartbeat.loss',
            worstMetricValueNumeric: 0,
            worstMetricValueText: 'PING_TIMEOUT',
          },
          heartbeat: {
            metricKey: 'agent.heartbeat',
            latestTs: '2026-07-23T04:16:44.000Z',
            staleAgeSec: 121,
          },
          observedHardware: {
            observedAt: '2026-07-23T04:16:45.000Z',
            osProduct: 'Windows 11',
            hardwareSerial: 'OBSERVED-SERIAL',
          },
          metricEvidence: {
            metricKey: 'stale_age_sec',
            label: 'Stale Age',
            unit: 'seconds',
            windowMax: 14543,
            lastValueNumeric: 14543,
            lastValueText: '14543',
          },
          heartbeatPolicy: {
            metricKey: 'agent.heartbeat',
            policyVersion: 1,
            staleAfterSec: 120,
          },
        }),
      } as never,
      {
        getNodeContext: jest.fn().mockResolvedValue({
          kind: 'available',
          context: {
            node: {
              id: 'node-1',
              nodeCode: 'node-msi-341b683e',
              displayName: 'Maintenance Node 01',
              serialNumber: 'CANONICAL-SERIAL',
            },
            rack: {
              id: 'rack-1',
              rackCode: 'LOCAL-LAB-01',
              displayName: 'Local Lab Rack 01',
            },
          },
        }),
      } as never,
      {
        batchGetRacks: jest.fn(),
      } as never,
      new MonitoringServiceConfig({}),
    );

    const snapshot = await service.composeNodeSnapshot({
      alert: {
        fingerprint: 'fp-1',
        alertName: 'NodeStale',
        rawLabels: {},
        rawAnnotations: {},
        severity: 'warning',
        status: 'firing',
        category: 'availability',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'Node stale',
        description: 'Node stale',
        metricKey: 'stale_age_sec',
        observedWindow: '120s',
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: '14543',
        threshold: '120',
        startsAt: '2026-07-23T04:00:00.000Z',
        endsAt: null,
        lastReceivedAt: '2026-07-23T04:18:45.000Z',
        firstSyncedAt: '2026-07-23T04:18:45.000Z',
        lastSyncedAt: '2026-07-23T04:18:45.000Z',
        lastStatusChangedAt: '2026-07-23T04:18:45.000Z',
        scopeType: 'node',
        nodeId: 'node-1',
        rackId: 'rack-1',
        triageStatus: 'new',
        incidentId: null,
        incidentCode: null,
        incidentStatus: null,
        incidentSeverity: null,
        incidentTitle: null,
        incidentCreatedAt: null,
        incidentLinkedAt: null,
        lastEscalatedAt: null,
      },
      authorizationHeader: 'Bearer token',
      capturedAt: '2026-07-23T04:18:45.000Z',
    });

    expect(snapshot.completeness).toBe('complete');
    expect(snapshot.asset?.serialNumber).toBe('CANONICAL-SERIAL');
    expect(snapshot.observedHardware?.hardwareSerial).toBe('OBSERVED-SERIAL');
    expect(snapshot.sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          system: 'asset-service',
          dataset: 'nodes',
        }),
        expect.objectContaining({
          system: 'clickhouse',
          dataset: 'metric_profile',
          policyVersion: 1,
        }),
      ]),
    );
  });

  it('returns a partial snapshot when asset enrichment is unavailable', async () => {
    const service = new IncidentContextSnapshotComposerService(
      {
        getNodeContext: jest.fn().mockResolvedValue({
          currentCondition: {
            summaryTs: '2026-07-23T04:16:44.000Z',
            healthCode: 4,
            operationalSeverityCode: 0,
            signalSeverityCode: 2,
            isAnyStale: true,
            staleMetricCount: 1,
            warningMetricCount: 0,
            criticalMetricCount: 0,
          },
          heartbeat: null,
          observedHardware: null,
          metricEvidence: null,
          heartbeatPolicy: null,
        }),
      } as never,
      {
        getNodeContext: jest.fn().mockResolvedValue({
          kind: 'unavailable',
          reasonCode: 'TIMEOUT',
        }),
      } as never,
      {
        batchGetRacks: jest.fn(),
      } as never,
      new MonitoringServiceConfig({}),
    );

    const snapshot = await service.composeNodeSnapshot({
      alert: {
        fingerprint: 'fp-1',
        alertName: 'NodeStale',
        rawLabels: {},
        rawAnnotations: {},
        severity: 'warning',
        status: 'firing',
        category: 'availability',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'Node stale',
        description: 'Node stale',
        metricKey: 'stale_age_sec',
        observedWindow: '120s',
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: '14543',
        threshold: '120',
        startsAt: '2026-07-23T04:00:00.000Z',
        endsAt: null,
        lastReceivedAt: '2026-07-23T04:18:45.000Z',
        firstSyncedAt: '2026-07-23T04:18:45.000Z',
        lastSyncedAt: '2026-07-23T04:18:45.000Z',
        lastStatusChangedAt: '2026-07-23T04:18:45.000Z',
        scopeType: 'node',
        nodeId: 'node-1',
        rackId: 'rack-1',
        triageStatus: 'new',
        incidentId: null,
        incidentCode: null,
        incidentStatus: null,
        incidentSeverity: null,
        incidentTitle: null,
        incidentCreatedAt: null,
        incidentLinkedAt: null,
        lastEscalatedAt: null,
      },
      authorizationHeader: 'Bearer token',
      capturedAt: '2026-07-23T04:18:45.000Z',
    });

    expect(snapshot.completeness).toBe('partial');
    expect(snapshot.unavailableSources).toEqual([
      {
        source: 'asset-service',
        reasonCode: 'TIMEOUT',
      },
    ]);
  });

  it('composes a rack snapshot with canonical rack context and captured impact', async () => {
    const service = new IncidentContextSnapshotComposerService(
      {
        getRackInvestigation: jest.fn().mockResolvedValue({
          current: {
            summaryTs: '2026-07-23T04:16:44.000Z',
            rackSeverityCode: 3,
            totalNodes: 10,
            badNodes: 4,
            criticalNodes: 2,
            warningNodes: 2,
            staleNodes: 1,
            silentDeadNodes: 0,
            badNodeRatio: 0.4,
            isRackLevelFailure: true,
            hasSignalLoss: true,
            worstNodeId: 'node-9',
            worstMetricKey: 'node.heartbeat.loss',
            worstMetricValueNumeric: 0,
            worstMetricValueText: 'PING_TIMEOUT',
          },
          history: [],
        }),
      } as never,
      {
        getNodeContext: jest.fn(),
      } as never,
      {
        batchGetRacks: jest.fn().mockResolvedValue(
          new Map([
            [
              'rack-1',
              {
                id: 'rack-1',
                rackCode: 'LOCAL-LAB-01',
                displayName: 'Local Lab Rack 01',
                lifecycleState: 'ACTIVE',
                capacityState: 'OK',
                siteCode: 'HCM',
                roomCode: 'LAB',
              },
            ],
          ]),
        ),
      } as never,
      new MonitoringServiceConfig({}),
    );

    const snapshot = await service.composeRackSnapshot({
      alert: {
        fingerprint: 'fp-rack-1',
        alertName: 'RackCritical',
        rawLabels: {},
        rawAnnotations: {},
        severity: 'critical',
        status: 'firing',
        category: 'availability',
        environment: 'lab',
        team: 'infra',
        source: 'grafana',
        summary: 'Rack severity critical',
        description: 'Rack severity critical',
        metricKey: 'rack_severity_code',
        observedWindow: 'current-snapshot',
        dashboardUrl: null,
        runbookUrl: null,
        currentValue: '3',
        threshold: '3',
        startsAt: '2026-07-23T04:00:00.000Z',
        endsAt: null,
        lastReceivedAt: '2026-07-23T04:18:45.000Z',
        firstSyncedAt: '2026-07-23T04:18:45.000Z',
        lastSyncedAt: '2026-07-23T04:18:45.000Z',
        lastStatusChangedAt: '2026-07-23T04:18:45.000Z',
        scopeType: 'rack',
        rackId: 'rack-1',
        triageStatus: 'new',
        incidentId: null,
        incidentCode: null,
        incidentStatus: null,
        incidentSeverity: null,
        incidentTitle: null,
        incidentCreatedAt: null,
        incidentLinkedAt: null,
        lastEscalatedAt: null,
      },
      capturedAt: '2026-07-23T04:18:45.000Z',
    });

    expect(snapshot.completeness).toBe('complete');
    expect(snapshot.asset).toEqual(
      expect.objectContaining({
        rackId: 'rack-1',
        rackCode: 'LOCAL-LAB-01',
        displayName: 'Local Lab Rack 01',
      }),
    );
    expect(snapshot.impact).toEqual({
      affectedNodeCount: 4,
      totalNodeCount: 10,
      affectedRatio: 0.4,
    });
  });
});
