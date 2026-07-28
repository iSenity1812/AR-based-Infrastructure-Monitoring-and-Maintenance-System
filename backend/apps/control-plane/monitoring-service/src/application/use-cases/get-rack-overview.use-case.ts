import { Inject, Injectable } from '@nestjs/common';

import {
  RackContextProvider,
  type RackContextRecord,
} from '../ports/rack-context.provider';
import {
  type RackOverviewCurrentRackRecord,
  type RackOverviewHistoryRecord,
  RackOverviewReadRepository,
} from '../ports/rack-overview-read.repository';
import { buildRackOverviewHistoryEnrichment } from './rack-overview-history-enrichment';

export type RackOverviewSortBy = 'severity' | 'badNodeRatio' | 'updatedAt';
export type RackOverviewSortOrder = 'asc' | 'desc';
export type RackSeverityText =
  | 'HEALTHY'
  | 'STALE'
  | 'WARNING'
  | 'HIGH'
  | 'CRITICAL';

export interface GetRackOverviewQuery {
  severity?: string;
  onlySignalLoss?: boolean | string;
  onlyFailure?: boolean | string;
  search?: string;
  sortBy?: RackOverviewSortBy;
  sortOrder?: RackOverviewSortOrder;
  page?: number | string;
  limit?: number | string;
}

export type RackOverviewItemView = {
  rackInfo: {
    id: string;
    rackCode: string;
    displayName: string;
    lifecycleState: string | null;
    capacityState: string | null;
    siteCode: string | null;
    roomCode: string | null;
    rowCode: string | null;
    positionCode: string | null;
    capacityLimit: number | null;
    notes: string | null;
    vendor: string | null;
    metadata: Record<string, unknown>;
    updatedAt: string;
  };
  healthStatus: {
    severityCode: number;
    severityText: RackSeverityText;
    isRackLevelFailure: boolean;
    hasSignalLoss: boolean;
    hasOverrideFlag: boolean;
  };
  blastRadius: {
    totalNodes: number;
    badNodes: number;
    criticalNodes: number;
    warningNodes: number;
    staleNodes: number;
    silentDeadNodes: number;
    badNodeRatio: number;
  };
  aggregateMetrics: {
    avgCpuUsagePct: number | null;
    avgMemoryUsedPct: number | null;
    maxDiskUsedPct: number | null;
    maxCpuTemperatureC: number | null;
    sumNetworkRxBytesSec: number | null;
    sumNetworkTxBytesSec: number | null;
  };
  culprit: {
    worstNodeId: string;
    worstMetricKey: string;
    worstMetricTags: Record<string, unknown>;
    worstMetricValueNumeric: number | null;
    worstMetricValueText: string | null;
  };
  trend: {
    delta1m: number;
    delta5m: number;
    lastChangeAgeSec: number | null;
  };
};

export type RackOverviewResponseView = {
  generatedAt: string;
  scope: 'rack';
  view: 'operator_dashboard';
  globalCounters: {
    totalRacks: number;
    criticalCount: number;
    highCount: number;
    warningCount: number;
    staleCount: number;
    healthyCount: number;
    globalRackLevelFailures: number;
  };
  racks: RackOverviewItemView[];
  paginationAndSort: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    currentSortBy: RackOverviewSortBy;
    currentSortOrder: RackOverviewSortOrder;
    activeFilters: {
      severity: string[];
      onlyFailure: boolean;
      onlySignalLoss: boolean;
      search: string;
    };
  };
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_SORT_BY: RackOverviewSortBy = 'severity';
const DEFAULT_SORT_ORDER: RackOverviewSortOrder = 'desc';
const ALL_SEVERITY_FILTERS = [
  'critical',
  'high',
  'warning',
  'stale',
  'healthy',
] as const;

@Injectable()
export class GetRackOverviewUseCase {
  constructor(
    @Inject(RackOverviewReadRepository)
    private readonly rackOverviewReadRepository: RackOverviewReadRepository,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
  ) {}

  async execute(
    query: GetRackOverviewQuery = {},
  ): Promise<RackOverviewResponseView> {
    const generatedAt = new Date();
    const normalizedQuery = normalizeQuery(query);

    const [currentRacks, history] = await Promise.all([
      this.rackOverviewReadRepository.listCurrentRacks(),
      this.rackOverviewReadRepository.listRecentRackHistory(),
    ]);

    const visibleRacks = currentRacks.filter((rack) =>
      isUsableRackId(rack.rackId),
    );
    const rackContextMap = await this.rackContextProvider.batchGetRacks(
      visibleRacks.map((rack) => rack.rackId),
    );

    const enrichedRacks = visibleRacks.map((rack) =>
      this.toRackOverviewItem(
        rack,
        history,
        generatedAt,
        rackContextMap.get(rack.rackId),
      ),
    );

    const filteredRacks = enrichedRacks.filter((rack) =>
      matchesRackFilters(rack, normalizedQuery),
    );
    const sortedRacks = [...filteredRacks].sort((left, right) =>
      compareRackItems(
        left,
        right,
        normalizedQuery.sortBy,
        normalizedQuery.sortOrder,
      ),
    );
    const totalItems = sortedRacks.length;
    const totalPages = Math.max(
      1,
      Math.ceil(totalItems / normalizedQuery.limit),
    );
    const currentPage = Math.min(normalizedQuery.page, totalPages);
    const start = (currentPage - 1) * normalizedQuery.limit;
    const racks = sortedRacks.slice(start, start + normalizedQuery.limit);

    return {
      generatedAt: generatedAt.toISOString(),
      scope: 'rack',
      view: 'operator_dashboard',
      globalCounters: buildGlobalCounters(filteredRacks),
      racks,
      paginationAndSort: {
        currentPage,
        pageSize: normalizedQuery.limit,
        totalPages,
        totalItems,
        currentSortBy: normalizedQuery.sortBy,
        currentSortOrder: normalizedQuery.sortOrder,
        activeFilters: {
          severity:
            normalizedQuery.severity.length > 0
              ? normalizedQuery.severity
              : [...ALL_SEVERITY_FILTERS],
          onlyFailure: normalizedQuery.onlyFailure,
          onlySignalLoss: normalizedQuery.onlySignalLoss,
          search: normalizedQuery.search,
        },
      },
    };
  }

  private toRackOverviewItem(
    rack: RackOverviewCurrentRackRecord,
    history: RackOverviewHistoryRecord[],
    generatedAt: Date,
    rackContext?: RackContextRecord,
  ): RackOverviewItemView {
    return buildRackOverviewItemFromRecord(
      rack,
      history,
      generatedAt,
      rackContext,
    );
  }
}

export function buildRackOverviewItemFromRecord(
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
  const fallbackId = rack.rackId;
  const rackUpdatedAt = toIsoString(rack.summaryTs);

  return {
    rackInfo: {
      id: fallbackId,
      rackCode: rackContext?.rackCode?.trim() || fallbackId,
      displayName: rackContext?.displayName?.trim() || fallbackId,
      lifecycleState: normalizeNullableString(rackContext?.lifecycleState),
      capacityState: normalizeNullableString(rackContext?.capacityState),
      siteCode: normalizeNullableString(rackContext?.siteCode),
      roomCode: normalizeNullableString(rackContext?.roomCode),
      rowCode: normalizeNullableString(rackContext?.rowCode),
      positionCode: normalizeNullableString(rackContext?.positionCode),
      capacityLimit: rackContext?.capacityLimit ?? null,
      notes: normalizeNullableString(rackContext?.notes),
      vendor: normalizeNullableString(rackContext?.vendor),
      metadata: rackContext?.metadata ?? {},
      updatedAt: rackUpdatedAt,
    },
    healthStatus: {
      severityCode: rack.rackSeverityCode,
      severityText: toSeverityText(rack.rackSeverityCode),
      isRackLevelFailure: toBinaryFlag(rack.isRackLevelFailure) === 1,
      hasSignalLoss: toBinaryFlag(rack.hasSignalLoss) === 1,
      hasOverrideFlag: toBinaryFlag(rack.hasOverrideFlag) === 1,
    },
    blastRadius: {
      totalNodes: rack.totalNodes,
      badNodes: rack.badNodes,
      criticalNodes: rack.criticalNodes,
      warningNodes: rack.warningNodes,
      staleNodes: rack.staleNodes,
      silentDeadNodes: rack.silentDeadNodes,
      badNodeRatio: rack.badNodeRatio,
    },
    aggregateMetrics: {
      avgCpuUsagePct: rack.avgCpuUsagePct,
      avgMemoryUsedPct: rack.avgMemoryUsedPct,
      maxDiskUsedPct: rack.maxDiskUsedPct,
      maxCpuTemperatureC: rack.maxCpuTemperatureC,
      sumNetworkRxBytesSec: rack.sumNetworkRxBytesSec,
      sumNetworkTxBytesSec: rack.sumNetworkTxBytesSec,
    },
    culprit: {
      worstNodeId: rack.worstNodeId,
      worstMetricKey: rack.worstMetricKey,
      worstMetricTags: metricTags,
      worstMetricValueNumeric: rack.worstMetricValueNumeric,
      worstMetricValueText: normalizeNullableString(rack.worstMetricValueText),
    },
    trend: {
      delta1m: historyEnrichment.severityTrendDelta1m,
      delta5m: historyEnrichment.severityTrendDelta5m,
      lastChangeAgeSec: historyEnrichment.lastChangeAgeSec,
    },
  };
}

type NormalizedRackOverviewQuery = {
  severity: string[];
  onlySignalLoss: boolean;
  onlyFailure: boolean;
  search: string;
  sortBy: RackOverviewSortBy;
  sortOrder: RackOverviewSortOrder;
  page: number;
  limit: number;
};

function normalizeQuery(
  query: GetRackOverviewQuery,
): NormalizedRackOverviewQuery {
  return {
    severity: normalizeSeverityFilter(query.severity),
    onlySignalLoss: toBoolean(query.onlySignalLoss),
    onlyFailure: toBoolean(query.onlyFailure),
    search: normalizeSearch(query.search),
    sortBy: normalizeSortBy(query.sortBy),
    sortOrder: normalizeSortOrder(query.sortOrder),
    page: normalizePositiveInt(query.page, DEFAULT_PAGE),
    limit: Math.min(
      normalizePositiveInt(query.limit, DEFAULT_LIMIT),
      MAX_LIMIT,
    ),
  };
}

function normalizeSeverityFilter(value?: string): string[] {
  if (!value?.trim()) {
    return [];
  }

  const normalized = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .map((item) => severityCodeToFilterLabel(item) ?? item)
    .filter((item): item is string => isSeverityFilter(item));

  return [...new Set(normalized)];
}

function severityCodeToFilterLabel(value: string): string | null {
  switch (value) {
    case '0':
      return 'healthy';
    case '1':
      return 'stale';
    case '2':
      return 'warning';
    case '3':
      return 'high';
    case '4':
      return 'critical';
    default:
      return null;
  }
}

function isSeverityFilter(
  value: string,
): value is (typeof ALL_SEVERITY_FILTERS)[number] {
  return (ALL_SEVERITY_FILTERS as readonly string[]).includes(value);
}

function normalizeSearch(value?: string): string {
  return value?.trim() ?? '';
}

function normalizeSortBy(value?: RackOverviewSortBy): RackOverviewSortBy {
  if (
    value === 'badNodeRatio' ||
    value === 'updatedAt' ||
    value === 'severity'
  ) {
    return value;
  }

  return DEFAULT_SORT_BY;
}

function normalizeSortOrder(
  value?: RackOverviewSortOrder,
): RackOverviewSortOrder {
  return value === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;
}

function normalizePositiveInt(
  value: string | number | undefined,
  fallback: number,
): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function toBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return value?.toLowerCase() === 'true';
}

function buildGlobalCounters(racks: RackOverviewItemView[]) {
  return {
    totalRacks: racks.length,
    criticalCount: racks.filter((rack) => rack.healthStatus.severityCode === 4)
      .length,
    highCount: racks.filter((rack) => rack.healthStatus.severityCode === 3)
      .length,
    warningCount: racks.filter((rack) => rack.healthStatus.severityCode === 2)
      .length,
    staleCount: racks.filter((rack) => rack.healthStatus.severityCode === 1)
      .length,
    healthyCount: racks.filter((rack) => rack.healthStatus.severityCode === 0)
      .length,
    globalRackLevelFailures: racks.filter(
      (rack) => rack.healthStatus.isRackLevelFailure,
    ).length,
  };
}

function matchesRackFilters(
  rack: RackOverviewItemView,
  query: NormalizedRackOverviewQuery,
): boolean {
  if (
    query.severity.length > 0 &&
    !query.severity.includes(toSeverityFilter(rack.healthStatus.severityCode))
  ) {
    return false;
  }

  if (query.onlyFailure && !rack.healthStatus.isRackLevelFailure) {
    return false;
  }

  if (query.onlySignalLoss && !rack.healthStatus.hasSignalLoss) {
    return false;
  }

  if (query.search) {
    const haystacks = [
      rack.rackInfo.rackCode,
      rack.rackInfo.displayName,
      rack.rackInfo.id,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystacks.includes(query.search.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function compareRackItems(
  left: RackOverviewItemView,
  right: RackOverviewItemView,
  sortBy: RackOverviewSortBy,
  sortOrder: RackOverviewSortOrder,
): number {
  const direction = sortOrder === 'asc' ? 1 : -1;

  let result = 0;
  if (sortBy === 'badNodeRatio') {
    result = compareNumbers(
      left.blastRadius.badNodeRatio,
      right.blastRadius.badNodeRatio,
    );
  } else if (sortBy === 'updatedAt') {
    result = compareNumbers(
      parseTimestamp(left.rackInfo.updatedAt),
      parseTimestamp(right.rackInfo.updatedAt),
    );
  } else {
    result = compareNumbers(
      left.healthStatus.severityCode,
      right.healthStatus.severityCode,
    );
  }

  if (result !== 0) {
    return result * direction;
  }

  return left.rackInfo.id.localeCompare(right.rackInfo.id);
}

function compareNumbers(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function toSeverityText(value: number): RackSeverityText {
  switch (value) {
    case 4:
      return 'CRITICAL';
    case 3:
      return 'HIGH';
    case 2:
      return 'WARNING';
    case 1:
      return 'STALE';
    default:
      return 'HEALTHY';
  }
}

function toSeverityFilter(value: number): string {
  switch (value) {
    case 4:
      return 'critical';
    case 3:
      return 'high';
    case 2:
      return 'warning';
    case 1:
      return 'stale';
    default:
      return 'healthy';
  }
}

function toBinaryFlag(value: number): 0 | 1 {
  return value >= 1 ? 1 : 0;
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

function normalizeNullableString(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toIsoString(value: string): string {
  const timestamp = parseTimestamp(value);
  if (!Number.isFinite(timestamp)) {
    return new Date(0).toISOString();
  }

  return new Date(timestamp).toISOString();
}

function parseTimestamp(value: string): number {
  if (!value || typeof value !== 'string') {
    return Number.NaN;
  }

  const normalized = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}Z`;
  return new Date(normalized).getTime();
}
