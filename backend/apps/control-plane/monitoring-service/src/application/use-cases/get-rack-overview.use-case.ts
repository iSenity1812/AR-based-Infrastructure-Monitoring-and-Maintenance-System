import { Inject, Injectable } from '@nestjs/common';

import { RackContextProvider } from '../ports/rack-context.provider';
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
    items: RackOverviewItemView[];
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

    const rackContextMap = await this.rackContextProvider.batchGetRacks(
      currentRacks.map((rack) => rack.rackId),
    );

    const items = currentRacks.map((rack) =>
      this.toRackOverviewItem(
        rack,
        history,
        generatedAt,
        rackContextMap.get(rack.rackId)?.displayName,
      ),
    );

    return {
      generatedAt: generatedAt.toISOString(),
      scope: 'rack',
      view: 'operator_dashboard',
      summary,
      topRiskRacks: items.slice(0, 3),
      rackGrid: {
        sortBy: [...RACK_GRID_SORT_ORDER],
        items,
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
    rackNameOverride?: string,
  ): RackOverviewItemView {
    const historyEnrichment = buildRackOverviewHistoryEnrichment(
      rack,
      history,
      generatedAt,
    );

    return {
      rackId: rack.rackId,
      rackName: rackNameOverride?.trim() || rack.rackId,
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
