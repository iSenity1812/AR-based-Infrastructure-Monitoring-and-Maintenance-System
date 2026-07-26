import { GetScopeInvestigationUseCase } from './get-scope-investigation.use-case';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';
import { InvestigationWindowPolicyService } from '../services/investigation-window-policy.service';

describe('GetScopeInvestigationUseCase', () => {
  it('returns node current context and requested metric series without a fixed metric list', async () => {
    const useCase = new GetScopeInvestigationUseCase(
      {
        getNodeInvestigation: jest.fn().mockResolvedValue({
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
            hardwareSerial: 'SER-OBSERVED',
          },
          metricEvidence: null,
          heartbeatPolicy: {
            metricKey: 'agent.heartbeat',
            policyVersion: 1,
            staleAfterSec: 120,
          },
          metricSeries: [
            {
              metricKey: 'cpu_temperature_c_current',
              label: 'CPU Temperature',
              unit: 'C',
              points: [
                {
                  timestamp: '2026-07-23 04:10:00',
                  valueNumeric: 88.1,
                  valueText: '88.1',
                  severityCode: 2,
                },
              ],
            },
          ],
        }),
        getRackInvestigation: jest.fn(),
        getNodeLiveness: jest.fn(),
      } as never,
      {
        getNodeContext: jest.fn().mockResolvedValue({
          kind: 'available',
          context: {
            node: {
              id: 'node-1',
              nodeCode: 'node-msi-341b683e',
              displayName: 'Maintenance Node 01',
              hostname: 'msi-maintenance-01',
              rackId: 'rack-1',
            },
            rack: {
              id: 'rack-1',
              rackCode: 'LOCAL-LAB-01',
              displayName: 'Local Lab Rack 01',
              siteCode: 'HCM',
              roomCode: 'LAB',
            },
          },
        }),
      } as never,
      {
        batchGetRacks: jest.fn(),
      } as never,
      {
        listByScopeAndWindow: jest.fn().mockResolvedValue([
          {
            eventKey: 'alert:fp-1:alert.fired:2026-07-23T04:10:30.000Z',
            occurredAt: '2026-07-23T04:10:30.000Z',
            category: 'alert',
            type: 'alert.fired',
            data: { fingerprint: 'fp-1' },
            source: 'external-alert-sync',
          },
        ]),
      } as never,
      new InvestigationWindowPolicyService(new MonitoringServiceConfig({})),
    );

    await expect(
      useCase.execute({
        scopeType: 'node',
        scopeId: 'node-1',
        from: '2026-07-23T04:10:00.000Z',
        to: '2026-07-23T04:11:00.000Z',
        metricKey: 'cpu_temperature_c_current',
        authorizationHeader: 'Bearer token',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        scope: expect.objectContaining({
          scopeType: 'node',
          nodeCode: 'node-msi-341b683e',
        }),
        metricSeries: [
          expect.objectContaining({
            metricKey: 'cpu_temperature_c_current',
          }),
        ],
        monitoringTimeline: [
          expect.objectContaining({
            id: 'alert:fp-1:alert.fired:2026-07-23T04:10:30.000Z',
            type: 'alert.fired',
          }),
        ],
      }),
    );
  });

  it('returns rack current impact and requested-granularity series in the shared contract', async () => {
    const useCase = new GetScopeInvestigationUseCase(
      {
        getNodeInvestigation: jest.fn(),
        getRackInvestigation: jest.fn().mockResolvedValue({
          current: {
            summaryTs: '2026-07-23T04:12:00.000Z',
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
          history: [
            {
              bucketStart: '2026-07-23 04:05:00',
              summaryTs: '2026-07-23 04:05:58',
              rackSeverityCode: 2,
              totalNodes: 10,
              badNodes: 2,
              criticalNodes: 0,
              warningNodes: 2,
              badNodeRatio: 0.2,
              isRackLevelFailure: false,
              worstNodeId: 'node-3',
              worstMetricKey: 'memory_used_pct_current',
              worstMetricValueNumeric: 92,
              worstMetricValueText: '92',
            },
          ],
        }),
        getNodeLiveness: jest.fn(),
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
      {
        listByScopeAndWindow: jest.fn().mockResolvedValue([
          {
            eventKey: 'alert:fp-2:alert.resolved:2026-07-23T04:07:00.000Z',
            occurredAt: '2026-07-23T04:07:00.000Z',
            category: 'alert',
            type: 'alert.resolved',
            data: { fingerprint: 'fp-2' },
            source: 'external-alert-sync',
          },
        ]),
      } as never,
      new InvestigationWindowPolicyService(new MonitoringServiceConfig({})),
    );

    await expect(
      useCase.execute({
        scopeType: 'rack',
        scopeId: 'rack-1',
        from: '2026-07-23T04:00:00.000Z',
        to: '2026-07-23T04:10:00.000Z',
        interval: '5m',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        scope: expect.objectContaining({
          scopeType: 'rack',
          rackCode: 'LOCAL-LAB-01',
        }),
        currentContext: expect.objectContaining({
          impact: expect.objectContaining({
            affectedNodeCount: 4,
            totalNodeCount: 10,
          }),
        }),
        metricSeries: expect.arrayContaining([
          expect.objectContaining({ metricKey: 'rack_severity_code' }),
        ]),
        monitoringTimeline: [
          expect.objectContaining({
            type: 'alert.resolved',
          }),
        ],
      }),
    );
  });
});
