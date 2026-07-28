import { BadRequestException, Injectable } from '@nestjs/common';

import { MonitoringServiceConfig } from '../../infrastructure/config/monitoring-service-config';

export type InvestigationInterval = '1m' | '5m';

export interface InvestigationWindow {
  from: string;
  to: string;
  interval: InvestigationInterval;
  estimatedPoints: number;
}

@Injectable()
export class InvestigationWindowPolicyService {
  constructor(private readonly config: MonitoringServiceConfig) {}

  normalize(input: {
    from?: string;
    to?: string;
    interval?: string;
  }): InvestigationWindow {
    const from = normalizeIsoTimestamp(input.from, 'from');
    const to = normalizeIsoTimestamp(input.to, 'to');
    const interval = normalizeInterval(input.interval);

    if (from > to) {
      throw new BadRequestException({
        title: 'INVALID_INVESTIGATION_RANGE',
        detail: '`from` must be less than or equal to `to`.',
      });
    }

    const maxRangeMs =
      Math.max(this.config.monitoringInvestigationMaxRangeDays, 1) *
      24 *
      60 *
      60 *
      1000;
    const rangeMs = to.getTime() - from.getTime();
    if (rangeMs > maxRangeMs) {
      throw new BadRequestException({
        title: 'INVESTIGATION_RANGE_EXCEEDED',
        detail: `Investigation range must not exceed ${this.config.monitoringInvestigationMaxRangeDays} days.`,
      });
    }

    const estimatedPoints =
      Math.floor(rangeMs / intervalToMs(interval)) + 1;
    if (estimatedPoints > Math.max(this.config.monitoringInvestigationMaxPoints, 1)) {
      throw new BadRequestException({
        title: 'INVESTIGATION_POINT_LIMIT_EXCEEDED',
        detail: `Requested range and interval would return ${estimatedPoints} points, exceeding the configured limit of ${this.config.monitoringInvestigationMaxPoints}.`,
      });
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      interval,
      estimatedPoints,
    };
  }
}

function normalizeIsoTimestamp(input: string | undefined, field: 'from' | 'to'): Date {
  const normalized = input?.trim();
  if (!normalized) {
    throw new BadRequestException({
      title: 'INVESTIGATION_RANGE_REQUIRED',
      detail: `\`${field}\` is required for investigation queries.`,
    });
  }

  const timestamp = new Date(normalized);
  if (Number.isNaN(timestamp.getTime())) {
    throw new BadRequestException({
      title: 'INVALID_INVESTIGATION_TIMESTAMP',
      detail: `\`${field}\` must be a valid ISO-8601 timestamp.`,
    });
  }

  return timestamp;
}

function normalizeInterval(input?: string): InvestigationInterval {
  const normalized = input?.trim() ?? '1m';
  if (normalized === '1m' || normalized === '5m') {
    return normalized;
  }

  throw new BadRequestException({
    title: 'INVALID_INVESTIGATION_INTERVAL',
    detail: '`interval` must be one of: 1m, 5m.',
  });
}

function intervalToMs(interval: InvestigationInterval): number {
  switch (interval) {
    case '1m':
      return 60 * 1000;
    case '5m':
      return 5 * 60 * 1000;
  }
}
