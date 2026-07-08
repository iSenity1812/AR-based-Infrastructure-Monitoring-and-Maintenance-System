import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

import { ResponseMetaDto } from './health-response.dto';

export class RackMonitoringOperationalStateDto {
  @ApiProperty({
    description: 'Current backend-owned operational severity code for the rack.',
    example: 3,
  })
  severityCode!: number;

  @ApiProperty({
    description: 'Whether the current rack state is override-worthy.',
    example: true,
  })
  overrideFlag!: boolean;

  @ApiProperty({
    description: 'Current monitoring lifecycle status for the rack.',
    enum: ['active', 'resolved'],
    example: 'active',
  })
  lifecycleStatus!: 'active' | 'resolved';

  @ApiProperty({
    description: 'Deduplication fingerprint for the current monitoring posture.',
    example:
      'rack:rack-a1|source:rack_current_summary|severity:3|override:1|culprit:node-17|metric:cpu_usage_pct',
  })
  fingerprint!: string;

  @ApiProperty({
    description: 'First timestamp when this rack was observed in the current state lineage.',
    example: '2026-07-08T09:55:00.000Z',
  })
  firstObservedAt!: string;

  @ApiProperty({
    description: 'Latest timestamp when this rack state was observed.',
    example: '2026-07-08T09:59:30.000Z',
  })
  lastObservedAt!: string;

  @ApiProperty({
    description: 'Timestamp when the current logical state last changed.',
    example: '2026-07-08T09:55:00.000Z',
  })
  lastStateChangedAt!: string;

  @ApiProperty({
    description: 'Timestamp when the current active lifecycle opened. Null when resolved.',
    nullable: true,
    example: '2026-07-08T09:55:00.000Z',
  })
  openedAt!: string | null;

  @ApiProperty({
    description: 'Timestamp when the lifecycle resolved. Null when still active.',
    nullable: true,
    example: null,
  })
  resolvedAt!: string | null;
}

export class RackMonitoringNotificationStateDto {
  @ApiProperty({
    description: 'Synchronization status between backend monitoring state and Alertmanager.',
    enum: [
      'idle',
      'pending_open',
      'open_synced',
      'pending_resolve',
      'resolve_synced',
      'sync_failed',
    ],
    example: 'open_synced',
  })
  syncStatus!:
    | 'idle'
    | 'pending_open'
    | 'open_synced'
    | 'pending_resolve'
    | 'resolve_synced'
    | 'sync_failed';

  @ApiProperty({
    description: 'Latest attempt timestamp to synchronize this state outward.',
    nullable: true,
    example: '2026-07-08T09:55:02.000Z',
  })
  lastNotificationAttemptAt!: string | null;

  @ApiProperty({
    description: 'Latest successful outward synchronization timestamp.',
    nullable: true,
    example: '2026-07-08T09:55:03.000Z',
  })
  lastNotificationSyncedAt!: string | null;
}

export class RackMonitoringStateItemDto {
  @ApiProperty({
    description: 'Stable rack identifier used by the monitoring scope.',
    example: 'rack-a1',
  })
  rackId!: string;

  @ApiProperty({
    description: 'Human-friendly rack label. Falls back to rackId when enrichment is unavailable.',
    example: 'Rack A1',
  })
  rackName!: string;

  @ApiProperty({
    description: 'Rack code from asset context when available.',
    example: 'RACK-A1',
  })
  rackCode!: string;

  @ApiProperty({
    description: 'Backend-owned operational monitoring state for this rack.',
    type: RackMonitoringOperationalStateDto,
  })
  operational!: RackMonitoringOperationalStateDto;

  @ApiProperty({
    description: 'Alert synchronization state for this rack.',
    type: RackMonitoringNotificationStateDto,
  })
  notification!: RackMonitoringNotificationStateDto;
}

export class MonitoringRackStateResponseDto {
  @ApiProperty({
    description: 'Timestamp when the rack monitoring state payload was generated.',
    example: '2026-07-08T10:00:00.000Z',
  })
  generatedAt!: string;

  @ApiProperty({
    description: 'Contract scope identifier for the monitoring state payload.',
    example: 'rack',
  })
  scope!: 'rack';

  @ApiProperty({
    description: 'Logical view identifier for the monitoring state payload.',
    example: 'monitoring_state',
  })
  view!: 'monitoring_state';

  @ApiProperty({
    description: 'Current backend-owned rack monitoring states.',
    type: [RackMonitoringStateItemDto],
  })
  items!: RackMonitoringStateItemDto[];
}

export class MonitoringRackStateResponseEnvelopeDto {
  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(MonitoringRackStateResponseDto) }],
  })
  data!: MonitoringRackStateResponseDto;

  @ApiProperty({
    type: ResponseMetaDto,
  })
  meta!: ResponseMetaDto;
}
