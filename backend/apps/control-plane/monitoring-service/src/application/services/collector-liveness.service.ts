import { Inject, Injectable } from '@nestjs/common';

import { CollectorLivenessRepository } from '../ports/collector-liveness.repository';
import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

export type CollectorStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface CollectorLivenessView {
  nodeId: string;
  agentId: string | null;
  collectorStatus: CollectorStatus;
  lastHeartbeatAt: string | null;
  collectorFreshnessSec: number | null;
  heartbeatTimeoutSec: number;
  source: string | null;
  metricKey: string | null;
  sourceMetric: string | null;
}

@Injectable()
export class CollectorLivenessService {
  constructor(
    @Inject(CollectorLivenessRepository)
    private readonly collectorLivenessRepository: CollectorLivenessRepository,
    private readonly config: MonitoringServiceConfig,
  ) {}

  async getByNodeId(nodeId: string): Promise<CollectorLivenessView> {
    const record = await this.collectorLivenessRepository.findByNodeId(nodeId);
    const heartbeatTimeoutSec = this.config.collectorHeartbeatTimeoutSec;

    if (!record) {
      return {
        nodeId,
        agentId: null,
        collectorStatus: 'UNKNOWN',
        lastHeartbeatAt: null,
        collectorFreshnessSec: null,
        heartbeatTimeoutSec,
        source: null,
        metricKey: null,
        sourceMetric: null,
      };
    }

    const lastHeartbeatAt = toOptionalIsoString(record.lastHeartbeatAt);
    const collectorFreshnessSec = computeFreshnessSec(lastHeartbeatAt);

    return {
      nodeId: record.nodeId,
      agentId: record.agentId,
      collectorStatus: deriveCollectorStatus(
        collectorFreshnessSec,
        heartbeatTimeoutSec,
      ),
      lastHeartbeatAt,
      collectorFreshnessSec,
      heartbeatTimeoutSec,
      source: record.source,
      metricKey: record.metricKey,
      sourceMetric: record.sourceMetric,
    };
  }
}

export function deriveCollectorStatus(
  collectorFreshnessSec: number | null,
  heartbeatTimeoutSec: number,
): CollectorStatus {
  if (collectorFreshnessSec == null || collectorFreshnessSec < 0) {
    return 'UNKNOWN';
  }

  if (collectorFreshnessSec > heartbeatTimeoutSec) {
    return 'OFFLINE';
  }

  return 'ONLINE';
}

export function computeFreshnessSec(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
}

export function toOptionalIsoString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}
