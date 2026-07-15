import { describe, expect, it, jest } from '@jest/globals';

import { GetRackOverviewUseCase } from './get-rack-overview.use-case';
import type { RackContextProvider } from '../ports/rack-context.provider';
import type {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';

describe('GetRackOverviewUseCase', () => {
  it('filters placeholder rack ids out of the response and enriches the consumer-first schema', async () => {
    const currentRacks: RackOverviewCurrentRackRecord[] = [
      {
        rackId: 'rack-a1',
        summaryTs: '2026-07-01 10:15:00',
        rackSeverityCode: 3,
        hasOverrideFlag: 1,
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 5,
        warningNodes: 8,
        staleNodes: 2,
        silentDeadNodes: 1,
        badNodeRatio: 0.5417,
        isRackLevelFailure: 1,
        hasSignalLoss: 1,
        worstNodeId: 'node-17',
        worstMetricKey: 'cpu_usage_pct',
        worstMetricTagsJson: '{"host":"node-17"}',
        worstMetricValueNumeric: 98.4,
        worstMetricValueText: '98.4',
      },
      {
        rackId: 'null',
        summaryTs: '2026-07-01 10:15:00',
        rackSeverityCode: 0,
        hasOverrideFlag: 0,
        totalNodes: 1,
        badNodes: 0,
        criticalNodes: 0,
        warningNodes: 0,
        staleNodes: 0,
        silentDeadNodes: 0,
        badNodeRatio: 0,
        isRackLevelFailure: 0,
        hasSignalLoss: 0,
        worstNodeId: '',
        worstMetricKey: '',
        worstMetricTagsJson: '{}',
        worstMetricValueNumeric: 0,
        worstMetricValueText: '0',
      },
    ];
    const history: RackOverviewHistoryRecord[] = [];
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest.fn().mockResolvedValue(currentRacks),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
      getCurrentRackSummary: jest.fn().mockResolvedValue({
        totalRacks: 2,
        criticalRacks: 1,
        warningRacks: 0,
        staleRacks: 1,
        signalLossRacks: 1,
        rackLevelFailureRacks: 1,
      }),
      listRecentRackHistory: jest.fn().mockResolvedValue(history),
    };
    const batchGetRacks = jest.fn().mockResolvedValue(
      new Map([
        [
          'rack-a1',
          {
            id: 'rack-a1',
            rackCode: 'RACK-A1',
            displayName: 'Rack A1',
            lifecycleState: 'ACTIVE',
            capacityState: 'AVAILABLE',
            metadata: {},
          },
        ],
      ]),
    );
    const rackContextProvider: RackContextProvider = {
      batchGetRacks,
    };

    const useCase = new GetRackOverviewUseCase(
      rackOverviewReadRepository,
      rackContextProvider,
    );

    const result = await useCase.execute();

    expect(batchGetRacks).toHaveBeenCalledWith(['rack-a1']);
    expect(result.overview.counts).toEqual({
      total: 2,
      critical: 1,
      warning: 0,
      stale: 1,
      signalLoss: 1,
      rackLevelFailure: 1,
    });
    expect(result.riskCards).toHaveLength(1);
    expect(result.riskCards[0]).toMatchObject({
      rack: {
        id: 'rack-a1',
        name: 'Rack A1',
        code: 'RACK-A1',
      },
      status: {
        severity: 'critical',
        override: true,
        rackLevelFailure: true,
        signalLoss: true,
        staleNodes: 2,
      },
      metrics: {
        totalNodes: 24,
        badNodes: 13,
        criticalNodes: 5,
        warningNodes: 8,
        badNodeRatio: 0.5417,
      },
      culprit: {
        nodeId: 'node-17',
        metric: {
          key: 'cpu_usage_pct',
          tags: {
            host: 'node-17',
          },
          value: {
            numeric: 98.4,
            text: '98.4',
          },
        },
      },
      trend: {
        delta1m: 0,
        delta5m: 0,
        lastChangeAgeSec: null,
      },
      updatedAt: '2026-07-01 10:15:00',
      location: {
        site: undefined,
        room: undefined,
        zone: undefined,
        row: undefined,
        position: undefined,
      },
    });
    expect(result.rackList.sort).toEqual([
      'severity',
      'rackLevelFailure',
      'signalLoss',
      'badNodeRatio',
      'staleNodes',
      'updatedAt',
      'rackId',
    ]);
  });
});
