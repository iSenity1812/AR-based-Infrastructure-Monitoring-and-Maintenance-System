import { Injectable } from '@nestjs/common';
import {
  MonitoringInputField,
  MonitoringSnapshotInputProps,
} from '../../../domain/entities/monitoring-input.entity';
import { MonitoringScopeType } from '../../../domain/constants/monitoring-scope-type.enum';
import { IngestMonitoringSnapshotUseCase } from '../../../application/use-cases/commands/ingest-monitoring-snapshot.use-case';

export interface RedisSnapshotFieldRecord {
  metricKey: string;
  value: number | string | boolean | null;
  unit?: string;
  source?: string;
  observedAt: string | Date;
}

export interface RedisLatestSnapshotRecord {
  scopeType: MonitoringScopeType;
  scopeId: string;
  agentId?: string;
  metrics: Record<string, RedisSnapshotFieldRecord>;
  batchSequence: number;
  deliveryIdentity?: string;
  updatedAt: string | Date;
}

@Injectable()
export class RedisLatestSnapshotAdapter {
  constructor(
    private readonly ingestMonitoringSnapshot: IngestMonitoringSnapshotUseCase,
  ) {}

  async ingestRecord(record: RedisLatestSnapshotRecord) {
    return this.ingestMonitoringSnapshot.execute(this.normalize(record));
  }

  normalize(record: RedisLatestSnapshotRecord): MonitoringSnapshotInputProps {
    const metrics = Object.fromEntries(
      Object.entries(record.metrics).map(([metricKey, field]) => [
        metricKey,
        this.normalizeField(metricKey, field),
      ]),
    );

    return {
      scopeType: record.scopeType,
      scopeId: record.scopeId,
      agentId: record.agentId,
      metrics,
      batchSequence: record.batchSequence,
      deliveryIdentity: record.deliveryIdentity,
      updatedAt: this.toDate(record.updatedAt),
    };
  }

  private normalizeField(
    fallbackMetricKey: string,
    field: RedisSnapshotFieldRecord,
  ): MonitoringInputField {
    return {
      metricKey: field.metricKey || fallbackMetricKey,
      value: field.value,
      unit: field.unit,
      source: field.source,
      observedAt: this.toDate(field.observedAt),
    };
  }

  private toDate(input: string | Date): Date {
    return input instanceof Date ? input : new Date(input);
  }
}
