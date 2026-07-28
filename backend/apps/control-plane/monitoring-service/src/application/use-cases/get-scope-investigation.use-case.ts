import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ScopeInvestigationResponseView } from '../dto/scope-investigation-response.dto';
import { AssetNodeContextProvider } from '../ports/asset-node-context.provider';
import { IncidentContextReadRepository } from '../ports/incident-context-read.repository';
import { MonitoringEventRepository } from '../ports/monitoring-event.repository';
import { RackContextProvider } from '../ports/rack-context.provider';
import { InvestigationWindowPolicyService } from '../services/investigation-window-policy.service';

export interface GetScopeInvestigationCommand {
  scopeType: 'node' | 'rack';
  scopeId: string;
  from?: string;
  to?: string;
  interval?: string;
  metricKey?: string;
  authorizationHeader?: string;
  correlationId?: string;
}

@Injectable()
export class GetScopeInvestigationUseCase {
  constructor(
    @Inject(IncidentContextReadRepository)
    private readonly incidentContextReadRepository: IncidentContextReadRepository,
    @Inject(AssetNodeContextProvider)
    private readonly assetNodeContextProvider: AssetNodeContextProvider,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
    @Inject(MonitoringEventRepository)
    private readonly monitoringEventRepository: MonitoringEventRepository,
    private readonly investigationWindowPolicyService: InvestigationWindowPolicyService,
  ) {}

  async execute(
    command: GetScopeInvestigationCommand,
  ): Promise<ScopeInvestigationResponseView> {
    const scopeId = normalizeScopeId(command.scopeId);
    const window = this.investigationWindowPolicyService.normalize({
      from: command.from,
      to: command.to,
      interval: command.interval,
    });

    switch (command.scopeType) {
      case 'node':
        return this.getNodeInvestigation({
          ...command,
          scopeId,
          window,
        });
      case 'rack':
        return this.getRackInvestigation({
          ...command,
          scopeId,
          window,
        });
      default:
        throw new BadRequestException({
          title: 'INVALID_SCOPE_TYPE',
          detail: '`scopeType` must be either `node` or `rack`.',
        });
    }
  }

  private async getNodeInvestigation(input: {
    scopeId: string;
    from?: string;
    to?: string;
    interval?: string;
    metricKey?: string;
    authorizationHeader?: string;
    correlationId?: string;
    window: ReturnType<InvestigationWindowPolicyService['normalize']>;
  }): Promise<ScopeInvestigationResponseView> {
    const [investigation, assetContext, monitoringTimeline] = await Promise.all([
      this.incidentContextReadRepository.getNodeInvestigation({
        nodeId: input.scopeId,
        metricKey: normalizeOptionalText(input.metricKey) ?? null,
        from: input.window.from,
        to: input.window.to,
      }),
      input.authorizationHeader?.trim()
        ? this.assetNodeContextProvider.getNodeContext({
            nodeId: input.scopeId,
            authorizationHeader: input.authorizationHeader,
            correlationId: input.correlationId,
          })
        : Promise.resolve({ kind: 'unavailable' as const, reasonCode: 'AUTH_REQUIRED' }),
      this.monitoringEventRepository.listByScopeAndWindow({
        scopeType: 'node',
        scopeId: input.scopeId,
        from: input.window.from,
        to: input.window.to,
      }),
    ]);

    const sourceRefs = [
      ...(investigation.currentCondition?.summaryTs
        ? [
            {
              system: 'clickhouse',
              dataset: 'node_current_summary',
              observedAt: investigation.currentCondition.summaryTs,
            },
          ]
        : []),
      ...(investigation.observedHardware?.observedAt
        ? [
            {
              system: 'clickhouse',
              dataset: 'node_fingerprint_latest',
              observedAt: investigation.observedHardware.observedAt,
            },
          ]
        : []),
      ...(investigation.metricSeries.length > 0
        ? [
            {
              system: 'clickhouse',
              dataset: 'v_agg_1m_by_scope_metric',
              observedAt: input.window.to,
            },
          ]
        : []),
      ...(investigation.heartbeatPolicy?.policyVersion != null
        ? [
            {
              system: 'clickhouse',
              dataset: 'metric_profile',
              policyVersion: investigation.heartbeatPolicy.policyVersion,
            },
          ]
        : []),
      ...(assetContext.kind === 'available'
        ? [
            {
              system: 'asset-service',
              dataset: 'nodes',
              observedAt: new Date().toISOString(),
            },
          ]
        : []),
    ];

    return {
      generatedAt: new Date().toISOString(),
      scope:
        assetContext.kind === 'available'
          ? {
              scopeType: 'node',
              scopeId: input.scopeId,
              nodeId: input.scopeId,
              nodeCode: assetContext.context.node.nodeCode,
              displayName: assetContext.context.node.displayName,
              rackId: assetContext.context.rack?.id,
              rackCode: assetContext.context.rack?.rackCode,
              rackDisplayName: assetContext.context.rack?.displayName,
              siteCode: assetContext.context.rack?.siteCode,
              roomCode: assetContext.context.rack?.roomCode,
            }
          : {
              scopeType: 'node',
              scopeId: input.scopeId,
              nodeId: input.scopeId,
              nodeCode: input.scopeId,
              displayName: input.scopeId,
            },
      currentContext: {
        observedAt:
          investigation.currentCondition?.summaryTs ??
          investigation.observedHardware?.observedAt,
        condition: investigation.currentCondition
          ? {
              healthCode: investigation.currentCondition.healthCode,
              operationalSeverityCode:
                investigation.currentCondition.operationalSeverityCode,
              signalSeverityCode:
                investigation.currentCondition.signalSeverityCode,
              isStale: investigation.currentCondition.isAnyStale,
              lastHeartbeatAt: investigation.heartbeat?.latestTs ?? undefined,
              staleAgeSec: investigation.heartbeat?.staleAgeSec ?? undefined,
              staleAfterSec:
                investigation.heartbeatPolicy?.staleAfterSec ?? undefined,
              policyVersion:
                investigation.heartbeatPolicy?.policyVersion ?? undefined,
              worstMetric: investigation.currentCondition.worstMetricKey
                ? {
                    metricKey: investigation.currentCondition.worstMetricKey,
                    valueNumeric:
                      investigation.currentCondition.worstMetricValueNumeric ??
                      undefined,
                    valueText:
                      investigation.currentCondition.worstMetricValueText ??
                      undefined,
                  }
                : undefined,
            }
          : undefined,
        impact: {
          affectedNodeCount: 1,
          totalNodeCount: 1,
          affectedRatio: 1,
        },
        observedHardware: investigation.observedHardware
          ? {
              observedAt: investigation.observedHardware.observedAt,
              osProduct: investigation.observedHardware.osProduct ?? undefined,
              primaryIpv4:
                investigation.observedHardware.primaryIpv4 ?? undefined,
              macAddress:
                investigation.observedHardware.macAddress ?? undefined,
              logicalCpuCount:
                investigation.observedHardware.logicalCpuCount ?? undefined,
              cpuArchitecture:
                investigation.observedHardware.cpuArchitecture ?? undefined,
              cpuModel: investigation.observedHardware.cpuModel ?? undefined,
              gpuModelPrimary:
                investigation.observedHardware.gpuModelPrimary ?? undefined,
              hardwareSerial:
                investigation.observedHardware.hardwareSerial ?? undefined,
              motherboardModel:
                investigation.observedHardware.motherboardModel ?? undefined,
              ssdModelPrimary:
                investigation.observedHardware.ssdModelPrimary ?? undefined,
              batteryModel:
                investigation.observedHardware.batteryModel ?? undefined,
            }
          : undefined,
      },
      window: {
        from: input.window.from,
        to: input.window.to,
        interval: input.window.interval,
        pointCount: input.window.estimatedPoints,
      },
      metricSeries: investigation.metricSeries.map((series) => ({
        metricKey: series.metricKey,
        label: series.label ?? undefined,
        unit: series.unit ?? undefined,
        points: series.points.map((point) => ({
          timestamp: normalizeTimestamp(point.timestamp),
          valueNumeric: point.valueNumeric ?? null,
          valueText: point.valueText ?? null,
          severityCode: point.severityCode ?? null,
        })),
      })),
      monitoringTimeline: monitoringTimeline.map((event) => ({
        id: event.eventKey,
        occurredAt: normalizeTimestamp(event.occurredAt),
        category: event.category,
        type: event.type,
        data: event.data,
        source: event.source,
      })),
      sourceRefs,
    };
  }

  private async getRackInvestigation(input: {
    scopeId: string;
    window: ReturnType<InvestigationWindowPolicyService['normalize']>;
  }): Promise<ScopeInvestigationResponseView> {
    const [investigation, rackMap, monitoringTimeline] = await Promise.all([
      this.incidentContextReadRepository.getRackInvestigation({
        rackId: input.scopeId,
        from: input.window.from,
        to: input.window.to,
        interval: input.window.interval,
      }),
      this.rackContextProvider.batchGetRacks([input.scopeId]),
      this.monitoringEventRepository.listByScopeAndWindow({
        scopeType: 'rack',
        scopeId: input.scopeId,
        from: input.window.from,
        to: input.window.to,
      }),
    ]);

    const rackContext = rackMap.get(input.scopeId);
    if (!investigation.current && !rackContext) {
      throw new NotFoundException({
        title: 'RACK_NOT_FOUND',
        detail: `Rack ${input.scopeId} was not found in current monitoring or asset context.`,
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      scope: {
        scopeType: 'rack',
        scopeId: input.scopeId,
        rackId: input.scopeId,
        rackCode: normalizeOptionalText(rackContext?.rackCode) ?? input.scopeId,
        displayName:
          normalizeOptionalText(rackContext?.displayName) ?? input.scopeId,
        siteCode: normalizeOptionalText(rackContext?.siteCode),
        roomCode: normalizeOptionalText(rackContext?.roomCode),
      },
      currentContext: {
        observedAt: investigation.current?.summaryTs,
        condition: investigation.current
          ? {
              rackSeverityCode: investigation.current.rackSeverityCode,
              isRackLevelFailure: investigation.current.isRackLevelFailure,
              hasSignalLoss: investigation.current.hasSignalLoss,
              worstMetric: investigation.current.worstMetricKey
                ? {
                    metricKey: investigation.current.worstMetricKey,
                    valueNumeric:
                      investigation.current.worstMetricValueNumeric ?? undefined,
                    valueText:
                      investigation.current.worstMetricValueText ?? undefined,
                  }
                : undefined,
            }
          : undefined,
        impact: investigation.current
          ? {
              affectedNodeCount: investigation.current.badNodes,
              totalNodeCount: investigation.current.totalNodes,
              affectedRatio: investigation.current.badNodeRatio,
              criticalNodeCount: investigation.current.criticalNodes,
              warningNodeCount: investigation.current.warningNodes,
              staleNodeCount: investigation.current.staleNodes,
              silentDeadNodeCount: investigation.current.silentDeadNodes,
            }
          : undefined,
      },
      window: {
        from: input.window.from,
        to: input.window.to,
        interval: input.window.interval,
        pointCount: input.window.estimatedPoints,
      },
      metricSeries: buildRackMetricSeries(investigation.history),
      monitoringTimeline: monitoringTimeline.map((event) => ({
        id: event.eventKey,
        occurredAt: normalizeTimestamp(event.occurredAt),
        category: event.category,
        type: event.type,
        data: event.data,
        source: event.source,
      })),
      sourceRefs: [
        ...(investigation.current?.summaryTs
          ? [
              {
                system: 'clickhouse',
                dataset: 'rack_current_summary',
                observedAt: investigation.current.summaryTs,
              },
            ]
          : []),
        ...(investigation.history.length > 0
          ? [
              {
                system: 'clickhouse',
                dataset: 'v_rack_summary_history',
                observedAt: normalizeTimestamp(
                  investigation.history[investigation.history.length - 1]!.summaryTs,
                ),
              },
            ]
          : []),
        ...(rackContext
          ? [
              {
                system: 'asset-service',
                dataset: 'racks',
                observedAt: new Date().toISOString(),
              },
            ]
          : []),
      ],
    };
  }
}

function buildRackMetricSeries(
  history: Awaited<
    ReturnType<IncidentContextReadRepository['getRackInvestigation']>
  >['history'],
) {
  return [
    {
      metricKey: 'rack_severity_code',
      label: 'Rack Severity Code',
      unit: 'severity-code',
      points: history.map((row) => ({
        timestamp: normalizeTimestamp(row.bucketStart),
        valueNumeric: row.rackSeverityCode,
      })),
    },
    {
      metricKey: 'bad_nodes',
      label: 'Bad Nodes',
      unit: 'count',
      points: history.map((row) => ({
        timestamp: normalizeTimestamp(row.bucketStart),
        valueNumeric: row.badNodes,
      })),
    },
    {
      metricKey: 'bad_node_ratio',
      label: 'Bad Node Ratio',
      unit: 'ratio',
      points: history.map((row) => ({
        timestamp: normalizeTimestamp(row.bucketStart),
        valueNumeric: row.badNodeRatio,
      })),
    },
  ];
}

function normalizeScopeId(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    throw new BadRequestException({
      title: 'INVALID_SCOPE_ID',
      detail: '`scopeId` is required.',
    });
  }

  return normalized;
}

function normalizeOptionalText(input?: string | null): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized : undefined;
}

function normalizeTimestamp(input: string): string {
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? input : parsed.toISOString();
}
