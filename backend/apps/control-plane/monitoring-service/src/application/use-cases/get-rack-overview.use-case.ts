import { Inject, Injectable } from '@nestjs/common';

import {
  RackContextProvider,
  RackContextRecord,
} from '../ports/rack-context.provider';
import {
  RackOverviewCurrentRackRecord,
  RackOverviewHistoryRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';
import { buildRackOverviewHistoryEnrichment } from './rack-overview-history-enrichment';

export type RackOverviewItemView = {
  rackId: string;
  rackName: string;
  summaryTs: string;
  rackSeverityCode: 0 | 2 | 3;
  hasOverrideFlag: 0 | 1;
  totalNodes: number;
  badNodes: number;
  criticalNodes: number;
  warningNodes: number;
  staleNodes: number;
  badNodeRatio: number;
  isRackLevelFailure: 0 | 1;
  hasSignalLoss: 0 | 1;
  worstNodeId: string;
  worstMetricKey: string;
  worstMetricTagsJson: string;
  worstMetricValueNumeric: number;
  worstMetricValueText: string;
  severityTrendDelta1m: number;
  severityTrendDelta5m: number;
  lastChangeAgeSec: number | null;
};

export type RackGridItemView = {
  id: string;
  rackCode: string;
  displayName: string;
  lifecycleState: string;
  capacityState: string;
  siteCode?: string;
  roomCode?: string;
  zoneCode?: string;
  rowCode?: string;
  positionCode?: string;
  capacityLimit?: number;
  notes?: string;
  vendor?: string;
  metadata: Record<string, unknown>;
};

export type RackOverviewResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'operator_dashboard';
  summary: {
    totalRacks: number;
    criticalRacks: number;
    warningRacks: number;
    staleRacks: number;
    signalLossRacks: number;
    rackLevelFailureRacks: number;
  };
  topRiskRacks: RackOverviewItemView[];
  rackGrid: {
    sortBy: string[];
    items: RackGridItemView[];
  };
  filters: {
    severity: string[];
    onlyFailure: boolean;
    onlySignalLoss: boolean;
  };
};

const RACK_GRID_SORT_ORDER = [
  'rack_severity_code_desc',
  'is_rack_level_failure_desc',
  'has_signal_loss_desc',
  'bad_node_ratio_desc',
  'stale_nodes_desc',
  'summary_ts_desc',
  'rack_id_asc',
] as const;

const RACK_OVERVIEW_FILTERS = {
  severity: ['critical', 'warning', 'stale', 'normal'],
  onlyFailure: false,
  onlySignalLoss: false,
} as const;

@Injectable()
export class GetRackOverviewUseCase {
  constructor(
    @Inject(RackOverviewReadRepository)
    private readonly rackOverviewReadRepository: RackOverviewReadRepository,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
  ) {}

  async execute(): Promise<RackOverviewResponseView> {
    const generatedAt = new Date();

    const [currentRacks, summary, history] = await Promise.all([
      this.rackOverviewReadRepository.listCurrentRacks(),
      this.rackOverviewReadRepository.getCurrentRackSummary(),
      this.rackOverviewReadRepository.listRecentRackHistory(),
    ]);

    const visibleRacks = currentRacks.filter((rack) =>
      isUsableRackId(rack.rackId),
    );

    const rackContextMap = await this.rackContextProvider.batchGetRacks(
      visibleRacks.map((rack) => rack.rackId),
    );

    const topRiskRacks = visibleRacks.map((rack) =>
      this.toRackOverviewItem(
        rack,
        history,
        generatedAt,
        rackContextMap.get(rack.rackId),
      ),
    );

    const rackGridItems = visibleRacks.map((rack) =>
      this.toRackGridItem(rack.rackId, rackContextMap.get(rack.rackId)),
    );

    return {
      generatedAt: generatedAt.toISOString(),
      scope: 'rack',
      view: 'operator_dashboard',
      summary,
      topRiskRacks: topRiskRacks.slice(0, 3),
      rackGrid: {
        sortBy: [...RACK_GRID_SORT_ORDER],
        items: rackGridItems,
      },
      filters: {
        severity: [...RACK_OVERVIEW_FILTERS.severity],
        onlyFailure: RACK_OVERVIEW_FILTERS.onlyFailure,
        onlySignalLoss: RACK_OVERVIEW_FILTERS.onlySignalLoss,
      },
    };
  }

  private toRackOverviewItem(
    rack: RackOverviewCurrentRackRecord,
    history: RackOverviewHistoryRecord[],
    generatedAt: Date,
    rackContext?: RackContextRecord,
  ): RackOverviewItemView {
    const historyEnrichment = buildRackOverviewHistoryEnrichment(
      rack,
      history,
      generatedAt,
    );

    return {
      rackId: rack.rackId,
      rackName: rackContext?.displayName?.trim() || rack.rackId,
      summaryTs: rack.summaryTs,
      rackSeverityCode: toSeverityCode(rack.rackSeverityCode),
      hasOverrideFlag: toBinaryFlag(rack.hasOverrideFlag),
      totalNodes: rack.totalNodes,
      badNodes: rack.badNodes,
      criticalNodes: rack.criticalNodes,
      warningNodes: rack.warningNodes,
      staleNodes: rack.staleNodes,
      badNodeRatio: rack.badNodeRatio,
      isRackLevelFailure: toBinaryFlag(rack.isRackLevelFailure),
      hasSignalLoss: toBinaryFlag(rack.hasSignalLoss),
      worstNodeId: rack.worstNodeId,
      worstMetricKey: rack.worstMetricKey,
      worstMetricTagsJson: rack.worstMetricTagsJson,
      worstMetricValueNumeric: rack.worstMetricValueNumeric,
      worstMetricValueText: rack.worstMetricValueText,
      severityTrendDelta1m: historyEnrichment.severityTrendDelta1m,
      severityTrendDelta5m: historyEnrichment.severityTrendDelta5m,
      lastChangeAgeSec: historyEnrichment.lastChangeAgeSec,
    };
  }

  private toRackGridItem(
    rackId: string,
    rackContext?: RackContextRecord,
  ): RackGridItemView {
    return {
      id: rackContext?.id || rackId,
      rackCode: rackContext?.rackCode || rackId,
      displayName: rackContext?.displayName?.trim() || rackId,
      lifecycleState: rackContext?.lifecycleState || 'UNKNOWN',
      capacityState: rackContext?.capacityState || 'UNKNOWN',
      siteCode: rackContext?.siteCode,
      roomCode: rackContext?.roomCode,
      zoneCode: rackContext?.zoneCode,
      rowCode: rackContext?.rowCode,
      positionCode: rackContext?.positionCode,
      capacityLimit: rackContext?.capacityLimit,
      notes: rackContext?.notes,
      vendor: rackContext?.vendor,
      metadata: rackContext?.metadata || {},
    };
  }
}

function toBinaryFlag(value: number): 0 | 1 {
  return value >= 1 ? 1 : 0;
}

function toSeverityCode(value: number): 0 | 2 | 3 {
  if (value >= 3) {
    return 3;
  }

  if (value >= 2) {
    return 2;
  }

  return 0;
}

function isUsableRackId(rackId: string | null | undefined): rackId is string {
  if (typeof rackId !== 'string') {
    return false;
  }

  const normalized = rackId.trim();
  if (!normalized) {
    return false;
  }

  const lowered = normalized.toLowerCase();
  return lowered !== 'null' && lowered !== 'undefined';
}
