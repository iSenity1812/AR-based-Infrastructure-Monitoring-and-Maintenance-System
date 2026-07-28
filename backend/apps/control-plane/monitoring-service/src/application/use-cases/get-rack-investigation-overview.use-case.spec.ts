import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';

import { GetRackInvestigationOverviewUseCase } from './get-rack-investigation-overview.use-case';
import type { RackContextProvider } from '../ports/rack-context.provider';
import type { AlertCurrentStateRepository } from '../ports/alert-current-state.repository';
import type {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
  RackOverviewNodeSnapshotRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';
import type { AlertCurrentState } from '../../domain/alert-current-state';

describe('GetRackInvestigationOverviewUseCase', () => {
  it('composes a rack investigation overview with separated alerts and a bounded node snapshot', async () => {
    const rack = createRack({
      rackId: 'rack-a1',
      rackSeverityCode: 4,
      totalNodes: 12,
      badNodes: 3,
      criticalNodes: 1,
      warningNodes: 1,
      staleNodes: 1,
      worstNodeId: 'node-critical',
      worstMetricKey: 'cpu_usage_pct',
      worstMetricValueNumeric: 98,
      worstMetricValueText: '98',
    });
    const history: RackOverviewHistoryRecord[] = [
      createHistory({ rackId: 'rack-a1', rackSeverityCode: 2 }),
    ];
    const nodeSnapshot: RackOverviewNodeSnapshotRecord[] = [
      createNodeSnapshot({
        nodeId: 'node-critical',
        maxSeverityCode: 4,
        criticalMetricCount: 1,
      }),
      createNodeSnapshot({
        nodeId: 'node-warning',
        maxSeverityCode: 2,
        warningMetricCount: 1,
      }),
    ];
    const rackOverviewReadRepository = createRackRepository({
      getCurrentRack: jest.fn().mockResolvedValue(rack),
      listRecentRackHistoryByRackId: jest.fn().mockResolvedValue(history),
      listNodeSnapshotsByNodeIds: jest.fn().mockResolvedValue(nodeSnapshot),
    });
    const alertCurrentStateRepository = createAlertRepository([
      createAlert({
        scopeType: 'rack',
        rackId: 'rack-a1',
        severity: 'critical',
      }),
      createAlert({
        scopeType: 'node',
        nodeId: 'node-critical',
        rackId: 'rack-a1',
        severity: 'warning',
      }),
      createAlert({
        scopeType: 'workload',
        nodeId: 'node-warning',
        workloadId: 'workload-1',
        rackId: 'rack-a1',
        severity: 'warning',
      }),
    ]);
    const rackContextProvider: RackContextProvider = {
      batchGetRacks: jest.fn().mockResolvedValue(
        new Map([
          [
            'rack-a1',
            {
              id: 'rack-a1',
              rackCode: 'LOCAL-LAB-01',
              displayName: 'Local Lab 01',
              lifecycleState: 'ACTIVE',
              capacityState: 'AVAILABLE',
              metadata: {},
            },
          ],
        ]),
      ),
    };
    const useCase = new GetRackInvestigationOverviewUseCase(
      rackOverviewReadRepository,
      rackContextProvider,
      alertCurrentStateRepository,
    );

    const result = await useCase.execute('rack-a1');

    expect(rackOverviewReadRepository.getCurrentRack).toHaveBeenCalledWith(
      'rack-a1',
    );
    expect(
      rackOverviewReadRepository.listRecentRackHistoryByRackId,
    ).toHaveBeenCalledWith('rack-a1');
    expect(
      rackOverviewReadRepository.listNodeSnapshotsByNodeIds,
    ).toHaveBeenCalledWith(['node-critical', 'node-warning']);
    expect(alertCurrentStateRepository.listActiveByRackId).toHaveBeenCalledWith(
      'rack-a1',
    );
    expect(result).toMatchObject({
      scope: 'rack',
      view: 'rack_investigation_overview',
      rack: {
        rackInfo: {
          id: 'rack-a1',
          rackCode: 'LOCAL-LAB-01',
          displayName: 'Local Lab 01',
        },
        healthStatus: {
          severityCode: 4,
          severityText: 'CRITICAL',
        },
        blastRadius: {
          totalNodes: 12,
          badNodes: 3,
        },
        culprit: {
          worstNodeId: 'node-critical',
          worstMetricKey: 'cpu_usage_pct',
        },
      },
      alerts: {
        summary: {
          rackAlertCount: 1,
          childAlertCount: 2,
          criticalCount: 1,
          warningCount: 2,
        },
        rack: [{ scopeType: 'rack', fingerprint: 'rack-alert' }],
        child: [
          { scopeType: 'node', fingerprint: 'node-alert' },
          { scopeType: 'workload', fingerprint: 'workload-alert' },
        ],
      },
      nodeSnapshot: {
        totalNodes: 12,
        returned: 2,
        selectionMode: 'problem_first_then_recent',
        items: [
          {
            nodeId: 'node-critical',
            status: 'alerting',
            severity: 'critical',
            alertCounters: {
              criticalMetricCount: 1,
            },
          },
        ],
      },
      navigation: {
        nodesUrl: '/monitoring/racks/rack-a1/nodes',
      },
    });
  });

  it('returns not found when the rack has no current monitoring summary', async () => {
    const rackOverviewReadRepository = createRackRepository({
      getCurrentRack: jest.fn().mockResolvedValue(null),
    });
    const useCase = new GetRackInvestigationOverviewUseCase(
      rackOverviewReadRepository,
      { batchGetRacks: jest.fn() },
      createAlertRepository([]),
    );

    await expect(useCase.execute('rack-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(
      rackOverviewReadRepository.listRecentRackHistoryByRackId,
    ).not.toHaveBeenCalled();
  });
});

function createRackRepository(
  overrides: Partial<jest.Mocked<RackOverviewReadRepository>> = {},
): jest.Mocked<RackOverviewReadRepository> {
  return {
    listCurrentRacks: jest.fn().mockResolvedValue([]),
    listCurrentRacksChangedSince: jest.fn().mockResolvedValue([]),
    getCurrentRackSummary: jest.fn().mockResolvedValue({
      totalRacks: 0,
      criticalRacks: 0,
      warningRacks: 0,
      staleRacks: 0,
      signalLossRacks: 0,
      rackLevelFailureRacks: 0,
    }),
    listRecentRackHistory: jest.fn().mockResolvedValue([]),
    getCurrentRack: jest.fn().mockResolvedValue(createRack()),
    listRecentRackHistoryByRackId: jest.fn().mockResolvedValue([]),
    listNodeSnapshotsByNodeIds: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createAlertRepository(
  alerts: AlertCurrentState[],
): jest.Mocked<AlertCurrentStateRepository> {
  return {
    findByFingerprint: jest.fn(),
    upsert: jest.fn(),
    updateIncidentLinkage: jest.fn(),
    listByStatus: jest.fn(),
    listActiveRackAlerts: jest.fn(),
    listActiveNodeAlerts: jest.fn(),
    listActiveByNodeId: jest.fn(),
    listActiveByRackId: jest.fn().mockResolvedValue(alerts),
    listActiveByWorkloadId: jest.fn(),
    listActiveByServiceId: jest.fn(),
  };
}

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

function createHistory(
  overrides: Partial<RackOverviewHistoryRecord> = {},
): RackOverviewHistoryRecord {
  return {
    bucketGranularity: '1m',
    bucketStart: '2026-07-19T11:34:00.000Z',
    rackId: 'rack-a1',
    summaryTs: '2026-07-19 11:34:00',
    rackSeverityCode: 0,
    hasOverrideFlag: 0,
    totalNodes: 1,
    badNodes: 0,
    criticalNodes: 0,
    warningNodes: 0,
    badNodeRatio: 0,
    isRackLevelFailure: 0,
    worstNodeId: '',
    worstMetricKey: '',
    worstMetricTagsJson: '{}',
    worstMetricValueNumeric: 0,
    worstMetricValueText: '0',
    ...overrides,
  };
}

function createNodeSnapshot(
  overrides: Partial<RackOverviewNodeSnapshotRecord> = {},
): RackOverviewNodeSnapshotRecord {
  return {
    nodeId: 'node-a1',
    summaryTs: '2026-07-19 11:35:59',
    maxSeverityCode: 0,
    hasOverrideFlag: 0,
    isAnyStale: 0,
    staleMetricCount: 0,
    criticalMetricCount: 0,
    warningMetricCount: 0,
    cpuUsagePctCurrent: 10,
    memoryUsagePctCurrent: 20,
    diskUsagePctCurrent: 30,
    cpuTemperatureCCurrent: 40,
    worstMetricKey: null,
    worstMetricValueNumeric: null,
    worstMetricValueText: null,
    ...overrides,
  };
}

function createAlert(
  input:
    | {
        scopeType: 'rack';
        rackId: string;
        severity: 'critical' | 'warning';
      }
    | {
        scopeType: 'node';
        nodeId: string;
        rackId: string;
        severity: 'critical' | 'warning';
      }
    | {
        scopeType: 'workload';
        nodeId: string;
        workloadId: string;
        rackId: string;
        severity: 'critical' | 'warning';
      },
): AlertCurrentState {
  const base = {
    fingerprint:
      input.scopeType === 'rack' ? 'rack-alert' : `${input.scopeType}-alert`,
    alertName: `${input.scopeType}.alert`,
    rawLabels: {},
    rawAnnotations: {},
    severity: input.severity,
    status: 'firing',
    category: 'availability',
    environment: 'test',
    team: 'ops',
    source: 'grafana',
    summary: 'Alert summary',
    description: 'Alert description',
    metricKey: null,
    observedWindow: null,
    dashboardUrl: null,
    runbookUrl: null,
    currentValue: null,
    threshold: null,
    startsAt: '2026-07-19T11:30:00.000Z',
    endsAt: null,
    lastReceivedAt: '2026-07-19T11:35:00.000Z',
    firstSyncedAt: '2026-07-19T11:30:00.000Z',
    lastSyncedAt: '2026-07-19T11:35:00.000Z',
    lastStatusChangedAt: '2026-07-19T11:35:00.000Z',
    triageStatus: 'new',
    incidentId: null,
    incidentCode: null,
    incidentStatus: null,
    incidentSeverity: null,
    incidentTitle: null,
    incidentCreatedAt: null,
    incidentLinkedAt: null,
    lastEscalatedAt: null,
  } as const;

  if (input.scopeType === 'rack') {
    return {
      ...base,
      scopeType: 'rack',
      rackId: input.rackId,
    };
  }

  if (input.scopeType === 'workload') {
    return {
      ...base,
      fingerprint: 'workload-alert',
      scopeType: 'workload',
      workloadId: input.workloadId,
      nodeId: input.nodeId,
      rackId: input.rackId,
    };
  }

  return {
    ...base,
    scopeType: 'node',
    nodeId: input.nodeId,
    rackId: input.rackId,
  };
}
