import { Inject, Injectable } from '@nestjs/common';

import type { AlertCurrentState } from '../../domain/alert-current-state';
import { AssetNodeContextProvider } from '../ports/asset-node-context.provider';
import { IncidentContextReadRepository } from '../ports/incident-context-read.repository';
import { RackContextProvider } from '../ports/rack-context.provider';
import type {
  IncidentContextSnapshot,
  IncidentContextSourceRef,
  IncidentContextUnavailableSource,
} from './incident-context-snapshot.contract';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

@Injectable()
export class IncidentContextSnapshotComposerService {
  constructor(
    @Inject(IncidentContextReadRepository)
    private readonly incidentContextReadRepository: IncidentContextReadRepository,
    @Inject(AssetNodeContextProvider)
    private readonly assetNodeContextProvider: AssetNodeContextProvider,
    @Inject(RackContextProvider)
    private readonly rackContextProvider: RackContextProvider,
    private readonly config: MonitoringServiceConfig,
  ) {}

  async composeNodeSnapshot(input: {
    alert: Extract<AlertCurrentState, { scopeType: 'node' }>;
    authorizationHeader: string;
    correlationId?: string;
    capturedAt?: string;
  }): Promise<IncidentContextSnapshot> {
    const capturedAt = input.capturedAt ?? new Date().toISOString();
    const window = buildSnapshotWindow(
      capturedAt,
      input.alert.startsAt,
      this.config.monitoringIncidentContextWindowMinutes,
    );

    const unavailableSources: IncidentContextUnavailableSource[] = [];
    const sourceRefs: IncidentContextSourceRef[] = [];

    const [clickhouseResult, assetResult] = await Promise.all([
      this.tryLoadClickhouseNodeContext({
        nodeId: input.alert.nodeId,
        metricKey: input.alert.metricKey,
        from: window.from,
        to: window.to,
      }),
      this.assetNodeContextProvider.getNodeContext({
        nodeId: input.alert.nodeId,
        authorizationHeader: input.authorizationHeader,
        correlationId: input.correlationId,
      }),
    ]);

    if (clickhouseResult.kind === 'unavailable') {
      unavailableSources.push({
        source: 'clickhouse',
        reasonCode: clickhouseResult.reasonCode,
      });
    } else {
      if (clickhouseResult.data.currentCondition?.summaryTs) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'node_current_summary',
          observedAt: clickhouseResult.data.currentCondition.summaryTs,
        });
      }

      if (clickhouseResult.data.observedHardware?.observedAt) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'node_fingerprint_latest',
          observedAt: clickhouseResult.data.observedHardware.observedAt,
        });
      }

      if (clickhouseResult.data.metricEvidence) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'v_agg_1m_by_scope_metric',
          observedAt: window.to,
        });
      }

      if (clickhouseResult.data.heartbeatPolicy?.policyVersion != null) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'metric_profile',
          policyVersion: clickhouseResult.data.heartbeatPolicy.policyVersion,
        });
      }
    }

    if (assetResult.kind === 'unavailable') {
      unavailableSources.push({
        source: 'asset-service',
        reasonCode: assetResult.reasonCode,
      });
    } else {
      sourceRefs.push({
        system: 'asset-service',
        dataset: 'nodes',
        observedAt: capturedAt,
      });
    }

    return {
      schemaVersion: 'incident.context.v1',
      capturedAt,
      window,
      completeness: resolveCompleteness({
        unavailableSources,
        hasCurrentCondition:
          clickhouseResult.kind === 'available' &&
          Boolean(clickhouseResult.data.currentCondition),
        hasAssetContext: assetResult.kind === 'available',
      }),
      unavailableSources,
      alert: {
        fingerprint: input.alert.fingerprint,
        alertName: input.alert.alertName,
        category: input.alert.category,
        severity: input.alert.severity,
        metricKey: input.alert.metricKey,
        currentValue: input.alert.currentValue,
        threshold: input.alert.threshold,
        startsAt: input.alert.startsAt,
        summary: input.alert.summary,
      },
      scope: {
        scopeType: 'node',
        scopeId: input.alert.nodeId,
        rackId: input.alert.rackId,
      },
      asset:
        assetResult.kind === 'available'
          ? {
              nodeCode: assetResult.context.node.nodeCode,
              displayName: assetResult.context.node.displayName,
              hostname: assetResult.context.node.hostname,
              serialNumber: assetResult.context.node.serialNumber,
              vendor: assetResult.context.node.vendor,
              model: assetResult.context.node.model,
              managementIp: assetResult.context.node.managementIp,
              rack: assetResult.context.rack
                ? {
                    rackId: assetResult.context.rack.id,
                    rackCode: assetResult.context.rack.rackCode,
                    displayName: assetResult.context.rack.displayName,
                    siteCode: assetResult.context.rack.siteCode,
                    roomCode: assetResult.context.rack.roomCode,
                  }
                : undefined,
            }
          : undefined,
      observedHardware:
        clickhouseResult.kind === 'available' && clickhouseResult.data.observedHardware
          ? {
              observedAt: clickhouseResult.data.observedHardware.observedAt,
              osProduct:
                clickhouseResult.data.observedHardware.osProduct ?? undefined,
              primaryIpv4:
                clickhouseResult.data.observedHardware.primaryIpv4 ?? undefined,
              macAddress:
                clickhouseResult.data.observedHardware.macAddress ?? undefined,
              logicalCpuCount:
                clickhouseResult.data.observedHardware.logicalCpuCount ?? undefined,
              cpuArchitecture:
                clickhouseResult.data.observedHardware.cpuArchitecture ??
                undefined,
              cpuModel:
                clickhouseResult.data.observedHardware.cpuModel ?? undefined,
              gpuModelPrimary:
                clickhouseResult.data.observedHardware.gpuModelPrimary ??
                undefined,
              hardwareSerial:
                clickhouseResult.data.observedHardware.hardwareSerial ??
                undefined,
              motherboardModel:
                clickhouseResult.data.observedHardware.motherboardModel ??
                undefined,
              ssdModelPrimary:
                clickhouseResult.data.observedHardware.ssdModelPrimary ??
                undefined,
              batteryModel:
                clickhouseResult.data.observedHardware.batteryModel ?? undefined,
            }
          : undefined,
      condition:
        clickhouseResult.kind === 'available' && clickhouseResult.data.currentCondition
          ? {
              observedAt: clickhouseResult.data.currentCondition.summaryTs,
              healthCode: clickhouseResult.data.currentCondition.healthCode,
              operationalSeverityCode:
                clickhouseResult.data.currentCondition.operationalSeverityCode,
              signalSeverityCode:
                clickhouseResult.data.currentCondition.signalSeverityCode,
              isStale: clickhouseResult.data.currentCondition.isAnyStale,
              lastHeartbeatAt:
                clickhouseResult.data.heartbeat?.latestTs ?? undefined,
              staleAgeSec:
                clickhouseResult.data.heartbeat?.staleAgeSec ?? undefined,
              staleAfterSec:
                clickhouseResult.data.heartbeatPolicy?.staleAfterSec ?? undefined,
              policyVersion:
                clickhouseResult.data.heartbeatPolicy?.policyVersion ?? undefined,
              worstMetric: clickhouseResult.data.currentCondition.worstMetricKey
                ? {
                    metricKey:
                      clickhouseResult.data.currentCondition.worstMetricKey,
                    valueNumeric:
                      clickhouseResult.data.currentCondition
                        .worstMetricValueNumeric ?? undefined,
                    valueText:
                      clickhouseResult.data.currentCondition.worstMetricValueText ??
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
      metricEvidence:
        clickhouseResult.kind === 'available' && clickhouseResult.data.metricEvidence
          ? [
              {
                metricKey: clickhouseResult.data.metricEvidence.metricKey,
                label:
                  clickhouseResult.data.metricEvidence.label ?? undefined,
                unit: clickhouseResult.data.metricEvidence.unit ?? undefined,
                windowMin:
                  clickhouseResult.data.metricEvidence.windowMin ?? null,
                windowMax:
                  clickhouseResult.data.metricEvidence.windowMax ?? null,
                windowAvg:
                  clickhouseResult.data.metricEvidence.windowAvg ?? null,
                lastValueNumeric:
                  clickhouseResult.data.metricEvidence.lastValueNumeric ?? null,
                lastValueText:
                  clickhouseResult.data.metricEvidence.lastValueText ?? null,
              },
            ]
          : [],
      sourceRefs,
    };
  }

  async composeRackSnapshot(input: {
    alert: Extract<AlertCurrentState, { scopeType: 'rack' }>;
    capturedAt?: string;
  }): Promise<IncidentContextSnapshot> {
    const capturedAt = input.capturedAt ?? new Date().toISOString();
    const window = buildSnapshotWindow(
      capturedAt,
      input.alert.startsAt,
      this.config.monitoringIncidentContextWindowMinutes,
    );

    const unavailableSources: IncidentContextUnavailableSource[] = [];
    const sourceRefs: IncidentContextSourceRef[] = [];

    const [clickhouseResult, rackMap] = await Promise.all([
      this.tryLoadClickhouseRackContext({
        rackId: input.alert.rackId,
        from: window.from,
        to: window.to,
        interval: window.interval,
      }),
      this.rackContextProvider.batchGetRacks([input.alert.rackId]),
    ]);

    const rackContext = rackMap.get(input.alert.rackId);
    if (!rackContext) {
      unavailableSources.push({
        source: 'asset-service',
        reasonCode: 'UNAVAILABLE',
      });
    } else {
      sourceRefs.push({
        system: 'asset-service',
        dataset: 'racks',
        observedAt: capturedAt,
      });
    }

    if (clickhouseResult.kind === 'unavailable') {
      unavailableSources.push({
        source: 'clickhouse',
        reasonCode: clickhouseResult.reasonCode,
      });
    } else {
      if (clickhouseResult.data.current?.summaryTs) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'rack_current_summary',
          observedAt: clickhouseResult.data.current.summaryTs,
        });
      }

      if (clickhouseResult.data.history.length > 0) {
        sourceRefs.push({
          system: 'clickhouse',
          dataset: 'v_rack_summary_history',
          observedAt:
            clickhouseResult.data.history[
              clickhouseResult.data.history.length - 1
            ]?.summaryTs,
        });
      }
    }

    return {
      schemaVersion: 'incident.context.v1',
      capturedAt,
      window,
      completeness: resolveCompleteness({
        unavailableSources,
        hasCurrentCondition:
          clickhouseResult.kind === 'available' &&
          Boolean(clickhouseResult.data.current),
        hasAssetContext: Boolean(rackContext),
      }),
      unavailableSources,
      alert: {
        fingerprint: input.alert.fingerprint,
        alertName: input.alert.alertName,
        category: input.alert.category,
        severity: input.alert.severity,
        metricKey: input.alert.metricKey,
        currentValue: input.alert.currentValue,
        threshold: input.alert.threshold,
        startsAt: input.alert.startsAt,
        summary: input.alert.summary,
      },
      scope: {
        scopeType: 'rack',
        scopeId: input.alert.rackId,
        rackId: input.alert.rackId,
      },
      asset: rackContext
        ? {
            rackId: rackContext.id,
            rackCode: rackContext.rackCode,
            displayName: rackContext.displayName,
            siteCode: rackContext.siteCode,
            roomCode: rackContext.roomCode,
            vendor: rackContext.vendor,
          }
        : undefined,
      impact:
        clickhouseResult.kind === 'available' && clickhouseResult.data.current
          ? {
              affectedNodeCount: clickhouseResult.data.current.badNodes,
              totalNodeCount: clickhouseResult.data.current.totalNodes,
              affectedRatio: clickhouseResult.data.current.badNodeRatio,
            }
          : undefined,
      metricEvidence:
        clickhouseResult.kind === 'available' && clickhouseResult.data.current
          ? [
              {
                metricKey: 'rack_severity_code',
                label: 'Rack Severity Code',
                unit: 'severity-code',
                lastValueNumeric: clickhouseResult.data.current.rackSeverityCode,
              },
              {
                metricKey: 'bad_nodes',
                label: 'Bad Nodes',
                unit: 'count',
                lastValueNumeric: clickhouseResult.data.current.badNodes,
              },
            ]
          : [],
      sourceRefs,
    };
  }

  private async tryLoadClickhouseNodeContext(input: {
    nodeId: string;
    metricKey: string | null;
    from: string;
    to: string;
  }) {
    try {
      return {
        kind: 'available' as const,
        data: await this.incidentContextReadRepository.getNodeContext(input),
      };
    } catch {
      return {
        kind: 'unavailable' as const,
        reasonCode: 'UPSTREAM_ERROR',
      };
    }
  }

  private async tryLoadClickhouseRackContext(input: {
    rackId: string;
    from: string;
    to: string;
    interval: '1m';
  }) {
    try {
      return {
        kind: 'available' as const,
        data: await this.incidentContextReadRepository.getRackInvestigation(input),
      };
    } catch {
      return {
        kind: 'unavailable' as const,
        reasonCode: 'UPSTREAM_ERROR',
      };
    }
  }
}

function buildSnapshotWindow(
  capturedAt: string,
  startsAt: string,
  configuredWindowMinutes: number,
) {
  const capturedAtMs = Date.parse(capturedAt);
  const startsAtMs = Date.parse(startsAt);
  const fallbackWindowMs = Math.max(configuredWindowMinutes, 1) * 60 * 1000;
  const fromMs = Number.isNaN(startsAtMs)
    ? capturedAtMs - fallbackWindowMs
    : Math.max(startsAtMs, capturedAtMs - fallbackWindowMs);

  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(capturedAtMs).toISOString(),
    interval: '1m' as const,
  };
}

function resolveCompleteness(input: {
  unavailableSources: IncidentContextUnavailableSource[];
  hasCurrentCondition: boolean;
  hasAssetContext: boolean;
}): IncidentContextSnapshot['completeness'] {
  if (input.unavailableSources.length === 0) {
    return 'complete';
  }

  if (!input.hasCurrentCondition && !input.hasAssetContext) {
    return 'minimal';
  }

  return 'partial';
}
