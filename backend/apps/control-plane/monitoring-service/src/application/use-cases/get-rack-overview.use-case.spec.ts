import { describe, expect, it, jest } from '@jest/globals';

import { GetRackOverviewUseCase } from './get-rack-overview.use-case';
import type { RackContextProvider } from '../ports/rack-context.provider';
import type {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';

describe('GetRackOverviewUseCase', () => {
  it('filters placeholder rack ids, preserves null aggregate metrics, and enriches flattened V2 response', async () => {
    const currentRacks: RackOverviewCurrentRackRecord[] = [
      createRack({
        rackId: 'rack-a1',
        summaryTs: '2026-07-19 11:35:59',
        rackSeverityCode: 4,
        hasOverrideFlag: 1,
        totalNodes: 2,
        badNodes: 0,
        criticalNodes: 0,
        warningNodes: 0,
        staleNodes: 2,
        silentDeadNodes: 2,
        badNodeRatio: 0,
        isRackLevelFailure: 0,
        hasSignalLoss: 1,
        worstNodeId: 'rack.signal.loss',
        worstMetricKey: 'rack.heartbeat.loss',
        worstMetricTagsJson: '{}',
        worstMetricValueNumeric: 0,
        worstMetricValueText: 'RACK_DISCONNECTED',
        avgCpuUsagePct: null,
        avgMemoryUsedPct: null,
        maxDiskUsedPct: null,
        maxCpuTemperatureC: null,
        sumNetworkRxBytesSec: null,
        sumNetworkTxBytesSec: null,
      }),
      createRack({
        rackId: 'null',
      }),
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
        rackLevelFailureRacks: 0,
      }),
      listRecentRackHistory: jest.fn().mockResolvedValue(history),
      getCurrentRack: jest.fn(),
      listRecentRackHistoryByRackId: jest.fn(),
      listRackNodeSnapshot: jest.fn(),
    };
    const batchGetRacks = jest.fn().mockResolvedValue(
      new Map([
        [
          'rack-a1',
          {
            id: 'rack-a1',
            rackCode: 'LOCAL-LAB-01',
            displayName: 'Local Lab 01',
            lifecycleState: 'ACTIVE',
            capacityState: 'AVAILABLE',
            siteCode: 'MY-HOME',
            roomCode: 'ROOM-01',
            rowCode: 'ROW-1',
            positionCode: 'P-1',
            capacityLimit: 42,
            notes: '',
            vendor: 'DELL',
            metadata: { seeded: true },
          },
        ],
      ]),
    );
    const rackContextProvider: RackContextProvider = { batchGetRacks };
    const useCase = new GetRackOverviewUseCase(
      rackOverviewReadRepository,
      rackContextProvider,
    );

    const result = await useCase.execute({
      severity: 'critical,high',
      sortBy: 'severity',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    });

    expect(batchGetRacks).toHaveBeenCalledWith(['rack-a1']);
    expect(result.globalCounters).toEqual({
      totalRacks: 1,
      criticalCount: 1,
      highCount: 0,
      warningCount: 0,
      staleCount: 0,
      healthyCount: 0,
      globalRackLevelFailures: 0,
    });
    expect(result.racks).toHaveLength(1);
    expect(result.racks[0]).toMatchObject({
      rackInfo: {
        id: 'rack-a1',
        rackCode: 'LOCAL-LAB-01',
        displayName: 'Local Lab 01',
        lifecycleState: 'ACTIVE',
        capacityState: 'AVAILABLE',
        siteCode: 'MY-HOME',
        roomCode: 'ROOM-01',
        rowCode: 'ROW-1',
        positionCode: 'P-1',
        capacityLimit: 42,
        notes: null,
        vendor: 'DELL',
        metadata: { seeded: true },
      },
      healthStatus: {
        severityCode: 4,
        severityText: 'CRITICAL',
        isRackLevelFailure: false,
        hasSignalLoss: true,
        hasOverrideFlag: true,
      },
      blastRadius: {
        totalNodes: 2,
        badNodes: 0,
        criticalNodes: 0,
        warningNodes: 0,
        staleNodes: 2,
        silentDeadNodes: 2,
        badNodeRatio: 0,
      },
      aggregateMetrics: {
        avgCpuUsagePct: null,
        avgMemoryUsedPct: null,
        maxDiskUsedPct: null,
        maxCpuTemperatureC: null,
        sumNetworkRxBytesSec: null,
        sumNetworkTxBytesSec: null,
      },
      culprit: {
        worstNodeId: 'rack.signal.loss',
        worstMetricKey: 'rack.heartbeat.loss',
        worstMetricTags: {},
        worstMetricValueNumeric: 0,
        worstMetricValueText: 'RACK_DISCONNECTED',
      },
      trend: {
        delta1m: 0,
        delta5m: 0,
        lastChangeAgeSec: null,
      },
    });
    expect(result.paginationAndSort).toEqual({
      currentPage: 1,
      pageSize: 50,
      totalPages: 1,
      totalItems: 1,
      currentSortBy: 'severity',
      currentSortOrder: 'desc',
      activeFilters: {
        severity: ['critical', 'high'],
        onlyFailure: false,
        onlySignalLoss: false,
        search: '',
      },
    });
  });

  it('falls back to rackId labels when asset enrichment is unavailable and applies search on fallback values', async () => {
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest.fn().mockResolvedValue([
        createRack({
          rackId: '6a5771e5931033f3bd53fb87',
          rackSeverityCode: 3,
        }),
      ]),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
      getCurrentRackSummary: jest.fn(),
      listRecentRackHistory: jest.fn().mockResolvedValue([]),
      getCurrentRack: jest.fn(),
      listRecentRackHistoryByRackId: jest.fn(),
      listRackNodeSnapshot: jest.fn(),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn().mockResolvedValue(new Map()),
    };
    const useCase = new GetRackOverviewUseCase(
      rackOverviewReadRepository,
      rackContextProvider,
    );

    const result = await useCase.execute({
      search: '6a5771e5931033f3bd53fb87',
      page: 1,
      limit: 50,
    });

    expect(result.racks[0].rackInfo).toMatchObject({
      id: '6a5771e5931033f3bd53fb87',
      rackCode: '6a5771e5931033f3bd53fb87',
      displayName: '6a5771e5931033f3bd53fb87',
    });
  });

  it('supports severity filter by numeric codes and paginates after sorting', async () => {
    const rackOverviewReadRepository: RackOverviewReadRepository = {
      listCurrentRacks: jest
        .fn()
        .mockResolvedValue([
          createRack({
            rackId: 'rack-a',
            rackSeverityCode: 4,
            badNodeRatio: 0.9,
          }),
          createRack({
            rackId: 'rack-b',
            rackSeverityCode: 3,
            badNodeRatio: 0.5,
          }),
          createRack({
            rackId: 'rack-c',
            rackSeverityCode: 2,
            badNodeRatio: 0.7,
          }),
        ]),
      listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
      getCurrentRackSummary: jest.fn(),
      listRecentRackHistory: jest.fn().mockResolvedValue([]),
      getCurrentRack: jest.fn(),
      listRecentRackHistoryByRackId: jest.fn(),
      listRackNodeSnapshot: jest.fn(),
    };
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn().mockResolvedValue(new Map()),
    };
    const useCase = new GetRackOverviewUseCase(
      rackOverviewReadRepository,
      rackContextProvider,
    );

    const result = await useCase.execute({
      severity: '4,3',
      sortBy: 'badNodeRatio',
      sortOrder: 'asc',
      page: 2,
      limit: 1,
    });

    expect(result.globalCounters.totalRacks).toBe(2);
    expect(result.paginationAndSort.totalPages).toBe(2);
    expect(result.racks).toHaveLength(1);
    expect(result.racks[0].rackInfo.id).toBe('rack-a');
  });
});

function createRack(
  overrides: Partial<RackOverviewCurrentRackRecord> = {},
): RackOverviewCurrentRackRecord {
  return {
    rackId: 'rack-a1',
    summaryTs: '2026-07-19 11:35:59',
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
    avgCpuUsagePct: 10,
    avgMemoryUsedPct: 20,
    maxDiskUsedPct: 30,
    maxCpuTemperatureC: 40,
    sumNetworkRxBytesSec: 50,
    sumNetworkTxBytesSec: 60,
    ...overrides,
  };
}
