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
  rack: {
    id: string;
    name: string;
    code: string;
  };
  status: {
    severity: 'normal' | 'warning' | 'critical';
    override: boolean;
    rackLevelFailure: boolean;
    signalLoss: boolean;
    staleNodes: number;
  };
  metrics: {
    totalNodes: number;
    badNodes: number;
    criticalNodes: number;
    warningNodes: number;
    badNodeRatio: number;
  };
  culprit: {
    nodeId: string;
    metric: {
      key: string;
      tags: Record<string, unknown>;
      value: {
        numeric: number;
        text: string;
      };
    };
  };
  trend: {
    delta1m: number;
    delta5m: number;
    lastChangeAgeSec: number | null;
  };
  updatedAt: string;
  location: {
    site?: string;
    room?: string;
    zone?: string;
    row?: string;
    position?: string;
  };
};

export type RackOverviewResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'operator_dashboard';
  overview: {
    counts: {
      total: number;
      critical: number;
      warning: number;
      stale: number;
      signalLoss: number;
      rackLevelFailure: number;
    };
  };
  riskCards: RackOverviewItemView[];
  rackList: {
    sort: string[];
  };
  filters: {
    severity: string[];
    onlyFailure: boolean;
    onlySignalLoss: boolean;
  };
};

const RACK_GRID_SORT_ORDER = [
  'severity',
  'rackLevelFailure',
  'signalLoss',
  'badNodeRatio',
  'staleNodes',
  'updatedAt',
  'rackId',
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

    return {
      generatedAt: generatedAt.toISOString(),
      scope: 'rack',
      view: 'operator_dashboard',
      overview: {
        counts: {
          total: summary.totalRacks,
          critical: summary.criticalRacks,
          warning: summary.warningRacks,
          stale: summary.staleRacks,
          signalLoss: summary.signalLossRacks,
          rackLevelFailure: summary.rackLevelFailureRacks,
        },
      },
      riskCards: topRiskRacks.slice(0, 3),
      rackList: {
        sort: [...RACK_GRID_SORT_ORDER],
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
    const metricTags = parseMetricTagsJson(rack.worstMetricTagsJson);

    return {
      rack: {
        id: rack.rackId,
        name: rackContext?.displayName?.trim() || rack.rackId,
        code: rackContext?.rackCode?.trim() || rack.rackId,
      },
      status: {
        severity: toSeverityLabel(rack.rackSeverityCode),
        override: toBinaryFlag(rack.hasOverrideFlag) === 1,
        rackLevelFailure: toBinaryFlag(rack.isRackLevelFailure) === 1,
        signalLoss: toBinaryFlag(rack.hasSignalLoss) === 1,
        staleNodes: rack.staleNodes,
      },
      metrics: {
        totalNodes: rack.totalNodes,
        badNodes: rack.badNodes,
        criticalNodes: rack.criticalNodes,
        warningNodes: rack.warningNodes,
        badNodeRatio: rack.badNodeRatio,
      },
      culprit: {
        nodeId: rack.worstNodeId,
        metric: {
          key: rack.worstMetricKey,
          tags: metricTags,
          value: {
            numeric: rack.worstMetricValueNumeric,
            text: rack.worstMetricValueText,
          },
        },
      },
      trend: {
        delta1m: historyEnrichment.severityTrendDelta1m,
        delta5m: historyEnrichment.severityTrendDelta5m,
        lastChangeAgeSec: historyEnrichment.lastChangeAgeSec,
      },
      updatedAt: rack.summaryTs,
      location: {
        site: rackContext?.siteCode,
        room: rackContext?.roomCode,
        zone: rackContext?.zoneCode,
        row: rackContext?.rowCode,
        position: rackContext?.positionCode,
      },
    };
  }
}

function toBinaryFlag(value: number): 0 | 1 {
  return value >= 1 ? 1 : 0;
}

function toSeverityLabel(value: number): 'normal' | 'warning' | 'critical' {
  if (value >= 3) {
    return 'critical';
  }

  if (value >= 2) {
    return 'warning';
  }

  return 'normal';
}

function parseMetricTagsJson(value: string): Record<string, unknown> {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
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
