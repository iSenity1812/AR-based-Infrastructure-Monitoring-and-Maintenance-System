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

export class RackAlertStateDto {
  @ApiProperty({
    description: 'Operator-facing rack alert status derived from active external alerts.',
    enum: ['healthy', 'alerting'],
    example: 'alerting',
  })
  status!: 'healthy' | 'alerting';

  @ApiProperty({
    description: 'Highest external alert severity currently affecting this rack.',
    enum: ['none', 'warning', 'critical'],
    example: 'critical',
  })
  highestSeverity!: 'none' | 'warning' | 'critical';

  @ApiProperty({
    description: 'Number of active rack-scoped alerts currently firing for this rack.',
    example: 2,
  })
  activeAlertCount!: number;

  @ApiProperty({
    description: 'Latest timestamp when the rack alert state changed.',
    nullable: true,
    example: '2026-07-15T14:20:00.000Z',
  })
  lastChangedAt!: string | null;
}

export class RackAlertSummaryDto {
  @ApiProperty({
    description: 'Number of active critical rack alerts.',
    example: 1,
  })
  critical!: number;

  @ApiProperty({
    description: 'Number of active warning rack alerts.',
    example: 1,
  })
  warning!: number;
}

export class RackPrimaryAlertDto {
  @ApiProperty({
    description: 'Deduplication fingerprint of the selected primary alert.',
    example: '56b08c98fd42c43a',
  })
  fingerprint!: string;

  @ApiProperty({
    description: 'Alert rule name from the external alert stack.',
    example: 'RackSignalLossPresent',
  })
  alertName!: string;

  @ApiProperty({
    description: 'Alert severity as exposed to operators.',
    enum: ['warning', 'critical'],
    example: 'critical',
  })
  severity!: 'warning' | 'critical';

  @ApiProperty({
    description: 'Alert category used for routing and UI grouping.',
    enum: [
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ],
    example: 'connectivity',
  })
  category!:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';

  @ApiProperty({
    description: 'Current alert status from the external read model.',
    enum: ['firing', 'resolved'],
    example: 'firing',
  })
  status!: 'firing' | 'resolved';

  @ApiProperty({
    description: 'Short operator-facing summary of the alert.',
    example: 'Rack A1 signal loss with 1 silent node(s)',
  })
  summary!: string;

  @ApiProperty({
    description: 'Longer alert description suitable for a detail panel.',
    example: 'Rack A1 is reporting signal loss.',
  })
  description!: string;

  @ApiProperty({
    description: 'Timestamp when the alert started firing.',
    example: '2026-07-15T14:20:00.000Z',
  })
  startsAt!: string;

  @ApiProperty({
    description: 'Timestamp when the alert resolved, if available.',
    nullable: true,
    example: null,
  })
  endsAt!: string | null;

  @ApiProperty({
    description: 'Dashboard URL for operator drill-down when available.',
    nullable: true,
    example: '/d/monitoring-overview',
  })
  dashboardUrl!: string | null;

  @ApiProperty({
    description: 'Runbook URL for operator guidance when available.',
    nullable: true,
    example: '/docs/runbooks/alerting/rack-signal-loss-present',
  })
  runbookUrl!: string | null;
}

export class RackActiveAlertDto {
  @ApiProperty({
    description: 'Deduplication fingerprint of the active alert.',
    example: '56b08c98fd42c43a',
  })
  fingerprint!: string;

  @ApiProperty({
    description: 'Alert rule name from the external alert stack.',
    example: 'RackSignalLossPresent',
  })
  alertName!: string;

  @ApiProperty({
    description: 'Alert severity as exposed to operators.',
    enum: ['warning', 'critical'],
    example: 'critical',
  })
  severity!: 'warning' | 'critical';

  @ApiProperty({
    description: 'Alert category used for routing and UI grouping.',
    enum: [
      'availability',
      'resource',
      'thermal',
      'runtime',
      'network',
      'connectivity',
    ],
    example: 'connectivity',
  })
  category!:
    | 'availability'
    | 'resource'
    | 'thermal'
    | 'runtime'
    | 'network'
    | 'connectivity';

  @ApiProperty({
    description: 'Current alert status from the external read model.',
    enum: ['firing', 'resolved'],
    example: 'firing',
  })
  status!: 'firing' | 'resolved';

  @ApiProperty({
    description: 'Short operator-facing summary of the active alert.',
    example: 'Rack A1 signal loss with 1 silent node(s)',
  })
  summary!: string;

  @ApiProperty({
    description: 'Timestamp when the alert started firing.',
    example: '2026-07-15T14:20:00.000Z',
  })
  startsAt!: string;
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

  @ApiProperty({
    description: 'Consumer-first rack alert state derived from active external alerts.',
    type: RackAlertStateDto,
  })
  state!: RackAlertStateDto;

  @ApiProperty({
    description: 'Count summary of active rack-scoped alerts.',
    type: RackAlertSummaryDto,
  })
  alertSummary!: RackAlertSummaryDto;

  @ApiProperty({
    description: 'Most important active alert selected for this rack.',
    nullable: true,
    type: RackPrimaryAlertDto,
  })
  primaryAlert!: RackPrimaryAlertDto | null;

  @ApiProperty({
    description: 'Active rack-scoped alerts for drill-down rendering.',
    type: [RackActiveAlertDto],
  })
  activeAlerts!: RackActiveAlertDto[];
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
